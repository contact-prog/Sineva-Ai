import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assemblyRequest, completedVideos } from '../src/components/services/video/steps/videoExport.ts';
import { validateAssembly, enqueueVideoAssembly } from '../supabase/functions/_shared/video-assembler.ts';

const input = { videoClips: [{ sceneNumber: 1, videoUrl: 'https://media.test/1.mp4', startTimeMs: 0, endTimeMs: 1000 }],
  audioLayers: {}, platforms: ['youtube'], duration: 1, style: 'narrative', logoUrl: null };
test('request includes duration, style and optional layer flags', () => {
  assert.deepEqual(assemblyRequest('generation', { duration: 42, style: 'product', platforms: ['tiktok'],
    includeLogo: true, includeVoiceover: false, includeMusic: true }), {
    action: 'start', videoGenerationId: 'generation', duration: 42, style: 'product', platforms: ['tiktok'],
    includeLogo: true, includeVoiceover: false, includeMusic: true,
  });
});
test('only completed jobs with downloadable videos succeed', () => {
  assert.equal(completedVideos({ status: 'running' }), null);
  assert.throws(() => completedVideos({ status: 'failed', error: 'render failed' }), /render failed/);
  assert.throws(() => completedVideos({ status: 'completed', videos: [] }), /without downloadable/);
  const videos = [{ url: 'https://storage.test/export.mp4' }];
  assert.equal(completedVideos({ status: 'completed', videos }), videos);
});
test('assembly rejects empty scenes, invalid durations and unsupported platforms', () => {
  validateAssembly(input);
  for (const patch of [{ videoClips: [] }, { duration: 0 }, { duration: NaN }, { duration: 301 },
    { platforms: [] }, { platforms: ['unknown'] }, { platforms: ['toString'] }, { style: '' },
    { videoClips: [{ ...input.videoClips[0], videoUrl: null }] }]) {
    assert.throws(() => validateAssembly({ ...input, ...patch }));
  }
});
test('enqueue persists media input but never credentials', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, request) => {
    assert.equal(url, 'https://db.test/rest/v1/rpc/enqueue_video_export');
    assert.deepEqual(JSON.parse(request.body), { generation_id: 'generation', export_input: input });
    return Response.json('job');
  };
  try {
    assert.equal(await enqueueVideoAssembly({ ...input, videoGenerationId: 'generation',
      supabaseUrl: 'https://db.test', supabaseKey: 'secret' }), 'job');
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(enqueueVideoAssembly({ ...input, videoGenerationId: 'generation',
      supabaseUrl: 'https://db.test', supabaseKey: 'secret' }), /enqueue/);
  } finally { globalThis.fetch = original; }
});

// Execute the actual Edge handler with only its network/runtime imports replaced by mocks.
const source = await readFile(new URL('../supabase/functions/assemble-final-videos/index.ts', import.meta.url), 'utf8');
let handler, queued;
globalThis.serveMock = fn => { handler = fn; };
globalThis.Deno = { env: { get: () => 'test' } };
let owner = true, auth = true, jobResult = { id: 'job', status: 'completed', result: [{ url: 'https://storage.test/final.mp4' }] };
const filters = [];
globalThis.clientMock = {
  auth: { getUser: async () => ({ data: { user: auth ? { id: 'owner' } : null } }) },
  from(table) {
    const query = { select() { return this; }, eq(key, value) { filters.push([table, key, value]); return this; },
      order: async () => ({ data: [{ scene_number: 1, video_clip_url: 'https://m.test/a', duration_seconds: 2 },
        { scene_number: 2, video_clip_url: 'https://m.test/b', duration_seconds: 3 }] }),
      maybeSingle: async () => ({ data: table === 'video_generations' ? (owner ? { id: 'generation', voiceover_url: 'voice', music_url: 'music' } : null) : jobResult }),
    };
    return query;
  },
};
globalThis.enqueueMock = async params => { queued = params; validateAssembly(params); return 'job'; };
const mocked = source.replace(/^import .*;\n/gm, '')
  .replace('const corsHeaders', 'const serve = globalThis.serveMock; const createClient = () => globalThis.clientMock; const enqueueVideoAssembly = globalThis.enqueueMock;\nconst corsHeaders');
// Node strips TypeScript using its built-in parser, without installing Deno or fetching imports.
const { stripTypeScriptTypes } = await import('node:module');
await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(mocked)).toString('base64'));
const request = body => new Request('https://edge.test', { method: 'POST', headers: { Authorization: 'Bearer token' }, body: JSON.stringify(body) });
test('Edge verifies auth and generation ownership before queueing', async () => {
  auth = false;
  assert.equal((await handler(request({ videoGenerationId: 'generation' }))).status, 401);
  auth = true; owner = false;
  assert.equal((await handler(request({ videoGenerationId: 'generation' }))).status, 404);
  owner = true;
  assert.ok(filters.some(([t, k, v]) => t === 'video_generations' && k === 'user_id' && v === 'owner'));
});
test('Edge queues cumulative scene timing and respects disabled audio', async () => {
  const response = await handler(request({ videoGenerationId: 'generation', platforms: ['youtube'], duration: 5, style: 'product' }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { success: true, jobId: 'job', status: 'queued', videos: [] });
  assert.deepEqual(queued.videoClips.map(c => [c.startTimeMs, c.endTimeMs]), [[0, 2000], [2000, 5000]]);
  assert.equal(queued.audioLayers.voiceoverUrl, undefined);
  assert.equal(queued.audioLayers.musicUrl, undefined);
  assert.equal((await handler(request({ videoGenerationId: 'generation', platforms: ['bad'], duration: 5, style: 'product' }))).status, 400);
});
test('Edge returns videos contract and scopes job lookup to generation', async () => {
  const response = await handler(request({ videoGenerationId: 'generation', action: 'status', jobId: 'job' }));
  assert.deepEqual((await response.json()).videos, jobResult.result);
  assert.ok(filters.some(([t, k, v]) => t === 'video_export_jobs' && k === 'video_generation_id' && v === 'generation'));
});
