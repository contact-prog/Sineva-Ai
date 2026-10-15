"""Durable Supabase queue consumer. Requires Python 3.12 and FFmpeg, no pip packages."""
import base64
import ipaddress
import json
import logging
import math
import os
from pathlib import Path
import socket
import signal
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request

PLATFORMS = {
    'instagram-post': (1080, 1080), 'instagram-story': (1080, 1920),
    'instagram-reel': (1080, 1920), 'tiktok': (1080, 1920),
    'youtube-short': (1080, 1920), 'youtube': (1920, 1080),
    'facebook-post': (1080, 1080), 'twitter': (1280, 720),
}
MAX_BYTES = 200 * 1024 * 1024
# Do not let uploaded media invoke HTTP, HLS, concat playlists, or other nested protocols.
INPUT_OPTIONS = ['-protocol_whitelist', 'file,pipe', '-format_whitelist',
                 'mov,matroska,webm,mp3,wav,png_pipe,jpeg_pipe,ogg,flac,aac']


def validate_url(url, allowed_hosts):
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != 'https' or parsed.username or parsed.password or
            parsed.port not in (None, 443) or parsed.hostname not in allowed_hosts):
        raise ValueError('Media URL must use HTTPS on an allowed host')
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError('Media host must resolve to public addresses')


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, hosts):
        self.hosts = hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl, self.hosts)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url, path, hosts, allow_audio_data=False):
    if allow_audio_data and url.startswith(('data:audio/mp3;base64,', 'data:audio/mpeg;base64,')):
        if len(url) > MAX_BYTES:
            raise ValueError('Audio data too large')
        path.write_bytes(base64.b64decode(url.split(',', 1)[1], validate=True))
        return
    validate_url(url, hosts)
    opener = urllib.request.build_opener(SafeRedirect(hosts))
    with opener.open(url, timeout=30) as response, path.open('wb') as out:
        size = 0
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                raise ValueError('Media exceeds 200 MiB')
            out.write(chunk)


def run(args, deadline):
    # No shell, no remote protocols in FFmpeg. A single deadline bounds the whole job.
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError('Export deadline exceeded')
    result = subprocess.run(args, capture_output=True, timeout=remaining)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed: {result.stderr.decode(errors="replace")[-1500:]}')
    return result.stdout


def probe(path, deadline):
    return json.loads(run(['ffprobe', '-v', 'error', *INPUT_OPTIONS, '-show_streams', '-show_format',
                           '-of', 'json', str(path)], deadline))


def ffmpeg(args, deadline):
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
         '-threads', '2', '-filter_complex_threads', '1', *args], deadline)


def render(clips, durations, audio, logo, size, output, deadline, total):
    """Normalize each scene, concatenate in order, pad/trim, then overlay and mix."""
    width, height = size
    args, filters = [], []
    for i, (clip, duration) in enumerate(zip(clips, durations)):
        args += [*INPUT_OPTIONS, '-i', str(clip)]
        filters.append(f'[{i}:v:0]setpts=PTS-STARTPTS,fps=30,scale={width}:{height}:'
                       f'force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,'
                       f'setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration={duration},'
                       f'trim=duration={duration},setpts=PTS-STARTPTS[v{i}]')
    filters.append(''.join(f'[v{i}]' for i in range(len(clips))) +
                   f'concat=n={len(clips)}:v=1:a=0[concat]')
    filters.append(f'[concat]tpad=stop_mode=clone:stop_duration={total},trim=duration={total}[base]')
    video_label = 'base'
    index = len(clips)
    if logo:
        args += [*INPUT_OPTIONS, '-i', str(logo)]
        filters.append(f'[{index}:v:0]scale={width // 6}:-1[logo]')
        filters.append('[base][logo]overlay=W-w-24:24:eof_action=repeat[outv]')
        video_label = 'outv'
        index += 1
    audio_labels = []
    for name, path in audio.items():
        if name == 'music':
            args += ['-stream_loop', '-1']
        args += [*INPUT_OPTIONS, '-i', str(path)]
        volume = 0.2 if name == 'music' else 1.0
        label = f'a{index}'
        filters.append(f'[{index}:a:0]aresample=48000,asetpts=PTS-STARTPTS,volume={volume},'
                       f'apad,atrim=duration={total}[{label}]')
        audio_labels.append(f'[{label}]')
        index += 1
    if audio_labels:
        filters.append(''.join(audio_labels) +
                       f'amix=inputs={len(audio_labels)}:duration=longest:normalize=0[outa]')
    args += ['-filter_complex', ';'.join(filters), '-map', f'[{video_label}]']
    args += ['-map', '[outa]', '-c:a', 'aac', '-b:a', '192k'] if audio_labels else ['-an']
    args += ['-t', str(total), '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast',
             '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
    ffmpeg(args, deadline)


def assemble(payload, directory, hosts, deadline):
    clips_data = sorted(payload['videoClips'], key=lambda c: c['sceneNumber'])
    if not 1 <= len(clips_data) <= 60:
        raise ValueError('Expected 1 to 60 scenes')
    duration = payload['duration']
    if not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 0 < duration <= 300:
        raise ValueError('Invalid duration')
    platforms = list(dict.fromkeys(payload['platforms']))
    if not platforms or len(platforms) > 8 or any(p not in PLATFORMS for p in platforms):
        raise ValueError('Unsupported platform')
    clips, durations = [], []
    for i, clip in enumerate(clips_data):
        length = (clip['endTimeMs'] - clip['startTimeMs']) / 1000
        if not math.isfinite(length) or not 0 < length <= 300:
            raise ValueError('Invalid scene duration')
        path = directory / f'scene-{i}.mp4'
        download(clip['videoUrl'], path, hosts)
        if not any(s['codec_type'] == 'video' for s in probe(path, deadline)['streams']):
            raise ValueError('Scene contains no video')
        clips.append(path)
        durations.append(length)
    # Scene durations describe the timeline. Requested duration trims excess or freezes the final frame.
    durations[-1] += max(0, duration - sum(durations))
    audio = {}
    for key, name in [('voiceoverUrl', 'voiceover'), ('musicUrl', 'music')]:
        if payload.get('audioLayers', {}).get(key):
            path = directory / f'{name}.audio'
            download(payload['audioLayers'][key], path, hosts, allow_audio_data=True)
            if not any(s['codec_type'] == 'audio' for s in probe(path, deadline)['streams']):
                raise ValueError('Audio layer contains no audio')
            audio[name] = path
    logo = None
    if payload.get('logoUrl'):
        logo = directory / 'logo.image'
        download(payload['logoUrl'], logo, hosts)
    outputs, cache = [], {}
    for platform in platforms:
        size = PLATFORMS[platform]
        if size not in cache:
            video = directory / f'{platform}.mp4'
            # Render the complete scene timeline, then limit to the requested duration.
            render(clips, durations, audio, logo, size, video, deadline, duration)
            thumbnail = directory / f'{platform}.jpg'
            ffmpeg([*INPUT_OPTIONS, '-i', str(video), '-frames:v', '1', '-update', '1', str(thumbnail)], deadline)
            info = probe(video, deadline)
            stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
            if (stream['width'], stream['height']) != size or video.stat().st_size > MAX_BYTES:
                raise ValueError('Invalid export dimensions or file size')
            cache[size] = video, thumbnail
        outputs.append((platform, *cache[size]))
    return outputs


class Supabase:
    def __init__(self):
        self.url = os.environ['SUPABASE_URL'].rstrip('/')
        self.key = os.environ['SUPABASE_SERVICE_ROLE_KEY']

    def request(self, path, data, content_type='application/json'):
        req = urllib.request.Request(self.url + path, data=data, method='POST', headers={
            'Authorization': f'Bearer {self.key}', 'apikey': self.key, 'Content-Type': content_type})
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)

    def rpc(self, name, data):
        return self.request('/rest/v1/rpc/' + name, json.dumps(data).encode())

    def upload(self, path, file, mime):
        self.request('/storage/v1/object/final-videos/' + path, file.read_bytes(), mime)
        return self.url + '/storage/v1/object/public/final-videos/' + path


def process_job(db, job, hosts):
    def expired(signum, frame):
        raise TimeoutError('Export exceeded 15 minute limit')
    previous_handler = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, 900)
    result, failure = None, None
    try:
        with tempfile.TemporaryDirectory(prefix='video-export-') as temp:
            outputs = assemble(job['input'], Path(temp), hosts, time.monotonic() + 900)
            result = []
            prefix = f"{job['video_generation_id']}/{job['id']}/{job['lease_token']}"
            for platform, video, thumbnail in outputs:
                width, height = PLATFORMS[platform]
                divisor = math.gcd(width, height)
                result.append({
                    'platform': platform, 'format': 'mp4',
                    'url': db.upload(f'{prefix}/{platform}.mp4', video, 'video/mp4'),
                    'thumbnailUrl': db.upload(f'{prefix}/{platform}.jpg', thumbnail, 'image/jpeg'),
                    'dimensions': f'{width}x{height}', 'aspectRatio': f'{width // divisor}:{height // divisor}',
                })
    except Exception:
        logging.exception('Export %s failed', job['id'])
        # Avoid persisting signed source URLs or credentials from external errors.
        failure = 'Video export failed. Check worker logs and retry assembly.'
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_handler)
    db.rpc('finish_video_export', {'job_id': job['id'], 'token': job['lease_token'],
                                   'videos': result, 'failure': failure})


def main():
    logging.basicConfig(level=logging.INFO)
    db = Supabase()
    hosts = {urllib.parse.urlsplit(db.url).hostname}
    hosts.update(h.strip() for h in os.environ.get('MEDIA_ALLOWED_HOSTS', '').split(',') if h.strip())
    while True:
        try:
            jobs = db.rpc('claim_video_export', {})
            if jobs:
                process_job(db, jobs[0], hosts)
            else:
                time.sleep(3)
        except Exception:
            logging.exception('Queue operation failed')
            time.sleep(5)


if __name__ == '__main__':
    main()
