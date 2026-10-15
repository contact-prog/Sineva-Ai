# Multi-scene video export

The shared assembler now submits durable jobs instead of returning simulated URLs.
Both `assemble-final-videos` (the staged UI) and `generate-video-story` (the automated
flow) use the same queue. A separate container runs FFmpeg; Supabase Edge Functions
only authenticate, enqueue and poll, so encoding is not tied to an Edge request's
CPU or response timeout.

## Deployment

1. Apply `supabase/migrations/20261015150000_video_export_jobs.sql`. It adds the
   service-role-only job table, atomic enqueue/claim/finish RPCs, and fields already
   used by the staged clip/audio workflow. It allows JPEG thumbnails in the existing
   `final-videos` bucket. Existing bucket visibility is preserved.
2. Deploy the changed `assemble-final-videos`, `generate-video-story`,
   `generate-video-clips` and `generate-video-audio` Edge Functions with their shared
   modules, then deploy the frontend.
3. Build and run an always-on worker (a VM or container service supporting background
   processes; a request-only or scale-to-zero service needs an appropriate worker mode):

   ```sh
   docker build -t sineva-video-assembler services/video-assembler
   docker run --restart unless-stopped --env-file /secure/video-assembler.env \
     --memory=4g --cpus=2 --tmpfs /tmp:rw,size=4g sineva-video-assembler
   ```

   Environment, supplied through your deployment secret manager:

   ```text
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   MEDIA_ALLOWED_HOSTS=cdn.pixabay.com
   ```

   The project Storage hostname is allowed automatically. Add exact, trusted public
   HTTPS hostnames for any other clip/logo/music source, including redirect hosts,
   separated by commas. Do not add user-controlled hosts. The worker checks schemes,
   hosts, DNS addresses and redirects, and restricts FFmpeg to local media formats and
   protocols. Apply outbound network restrictions as defense in depth. The service key
   stays in the worker/Edge environment and never enters a job payload or the browser.
   Production needs network access to Supabase and the configured asset hosts.

Each process handles one job at a time. Multiple replicas use `FOR UPDATE SKIP LOCKED`.
An active export is idempotent per video generation. Restarted workers recover leases
after 20 minutes, with at most three claims. An overall 15-minute job deadline leaves
room to finish before lease expiry. Render/download/upload errors mark the job failed;
the user can retry assembly without regenerating clips. A stale worker cannot commit
results after losing its lease. Monitor queue age and failed jobs in production. If no
worker is running, jobs remain queued until one starts.

Uploads use unique generation/job/lease paths. Completion and all video URLs are
committed atomically after every upload succeeds. Interrupted uploads can leave
unreferenced objects; include those in your normal Storage retention/cleanup policy.
The existing bucket limits each file to 200 MiB; the worker enforces the same video
limit. Sources are also limited to 200 MiB each, 60 scenes and a 300-second export.
Size disk and memory for your workload; the example above is a starting configuration.

## Media behavior

- Sort by scene number. Scene duration is `endTimeMs - startTimeMs`; these are timeline
  boundaries, not source seek positions. Normalize timestamps, frame rate (30 fps),
  pixel format and sample aspect ratio before concatenating.
- Preserve the source picture with centered letterboxing/pillarboxing. Short clips
  freeze their final frame to fill the planned scene duration. Trim the complete
  timeline to the requested duration or extend its last frame if needed.
- Produce H.264/yuv420p MP4 with fast-start metadata and AAC when audio is selected.
  Existing eight platform presets include square, portrait and landscape outputs.
  Equal-size platforms share an encode, with separate platform download URLs.
- Optional voiceover plays once and is padded with silence. Music loops to the video
  duration at 20% volume; both can be mixed. Clip-native audio is intentionally muted
  to avoid competing dialogue/music; no selected layers produces a silent export.
- Optional logo appears at top right with a 24-pixel inset, sized to one-sixth of the
  frame width. Transparent PNG is supported. A selected layer/logo that is unavailable
  fails explicitly. The renderer accepts the existing inline MP3 TTS data URLs.
- Generate an actual JPEG thumbnail per output. Upload all assets to `final-videos`.
  The completion UI uses each export's aspect ratio and always offers Download through
  Supabase Storage's `download` attachment parameter.
- `style` is required in the export contract and retained with the job. Artistic style
  is applied during upstream scene generation; export does not add a second color grade.

## API contract

`POST assemble-final-videos` authenticates the JWT and verifies generation ownership
before reading scenes, logos, or jobs. Example start body:

```json
{
  "action": "start",
  "videoGenerationId": "UUID",
  "duration": 40,
  "style": "product",
  "platforms": ["instagram-reel", "youtube"],
  "includeVoiceover": true,
  "includeMusic": true,
  "includeLogo": true
}
```

The 202 response is `{ "success": true, "jobId": "UUID", "status": "queued", "videos": [] }`.
Poll with `{ "action": "status", "videoGenerationId": "UUID", "jobId": "UUID" }`.
The response always uses `videos`, with `status` equal to queued/running/completed/failed.
Completed videos contain `platform`, `url`, `thumbnailUrl`, `dimensions`, `aspectRatio`
and `format: "mp4"`; failed jobs include `error`. The UI polls every three seconds,
stops on unmount, and offers status retry/export retry on failure. Closing the dialog
does not cancel the job; completed exports remain available in the video library.

The staged flow also reloads persisted scenes after planning/clip generation, waits for
background image generation, and renders cost approval before starting paid clips.

## Validation

```sh
node --test tests/video-export.test.mjs                         # Node 24+
python -m unittest discover -s services/video-assembler -v      # FFmpeg/ffprobe on PATH
npm ci --legacy-peer-deps --no-audit --no-fund
npm run build
npx tsc --noEmit -p tsconfig.app.json
```

`--legacy-peer-deps` is needed for the repository's existing date-fns 4 /
react-day-picker 8 peer conflict; export does not change the dependency lockfile.
The GitHub Actions workflow also builds the container and validates the queue migration
against a clean PostgreSQL 16 service using the fixture and assertions in `tests/`.
The fixture is for an isolated test database only, never an existing Supabase project.

Local results: frontend build/typecheck, focused frontend lint, seven Node contract/Edge
handler tests and eight Python tests passed. Real FFmpeg tests exercise all audio/logo
combinations, verify scene order using decoded pixels, check all eight production
resolutions, duration trimming/padding, JPEG output and corrupt-media failures. Queue
migration/assertions also passed on local PGlite PostgreSQL. Docker and a live Supabase
project were unavailable locally; container-build and PostgreSQL 16 checks are included
in CI. No deployed application, paid generation provider, or production Storage upload
was exercised. A staging smoke test after deploying the worker remains necessary:
use two existing clips, export portrait + landscape with/without selected layers,
verify playback and downloads, then stop/restart a worker to check queue recovery.
