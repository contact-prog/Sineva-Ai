import base64
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch

import worker


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'FFmpeg is required')
class RenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        for name, color, size, fps in [('red', 'red', '160x90', '24'), ('blue', 'blue', '90x160', '15')]:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i',
                            f'color={color}:s={size}:r={fps}:d=0.3', '-c:v', 'libx264',
                            str(cls.root / f'{name}.mp4')], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i',
                        'sine=frequency=440:duration=0.15', str(cls.root / 'tone.wav')], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=white:s=40x20',
                        '-frames:v', '1', '-threads', '1', str(cls.root / 'logo.png')], check=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def payload(self, voice=False, music=False, logo=False, duration=1):
        return {'videoClips': [
            {'sceneNumber': 2, 'videoUrl': 'blue', 'startTimeMs': 400, 'endTimeMs': 1000},
            {'sceneNumber': 1, 'videoUrl': 'red', 'startTimeMs': 0, 'endTimeMs': 400}],
            'duration': duration, 'platforms': ['youtube'],
            'audioLayers': {'voiceoverUrl': 'tone' if voice else None, 'musicUrl': 'tone' if music else None},
            'logoUrl': 'logo' if logo else None}

    def fake_download(self, url, path, *args, **kwargs):
        name = {'red': 'red.mp4', 'blue': 'blue.mp4', 'tone': 'tone.wav', 'logo': 'logo.png'}[url]
        shutil.copyfile(self.root / name, path)

    def frame(self, video, when):
        return subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(when), '-i', str(video),
            '-vf', 'crop=2:2:159:89', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-threads', '1', '-'])[:3]

    def test_all_audio_logo_combinations_and_scene_order(self):
        # Real files, codecs, audio and pixels; mock only source downloads and use small frames for speed.
        for voice in (False, True):
            for music in (False, True):
                for logo in (False, True):
                    with self.subTest(voice=voice, music=music, logo=logo), tempfile.TemporaryDirectory() as temp:
                        with patch.object(worker, 'download', self.fake_download), patch.dict(worker.PLATFORMS, youtube=(320, 180)):
                            result = worker.assemble(self.payload(voice, music, logo), Path(temp), set(), time.monotonic() + 60)
                        _, video, thumbnail = result[0]
                        info = worker.probe(video, time.monotonic() + 10)
                        self.assertAlmostEqual(float(info['format']['duration']), 1, delta=0.08)
                        self.assertEqual(any(s['codec_type'] == 'audio' for s in info['streams']), voice or music)
                        self.assertGreater(thumbnail.stat().st_size, 0)
                        if voice or music:
                            pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', '0.8', '-i', str(video),
                                '-t', '0.1', '-f', 's16le', '-ac', '1', '-ar', '48000', '-'])
                            import array
                            samples = array.array('h', pcm)
                            rms = (sum(x * x for x in samples) / len(samples)) ** 0.5
                            self.assertGreater(rms, 100) if music else self.assertLess(rms, 10)
                        red, blue = self.frame(video, 0.1), self.frame(video, 0.8)
                        self.assertGreater(red[0], red[2] + 100)
                        self.assertGreater(blue[2], blue[0] + 100)
                        if logo:
                            pixel = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(video), '-vf',
                                'crop=2:2:265:30', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-threads', '1', '-'])[:3]
                            self.assertTrue(all(p > 220 for p in pixel))

    def test_actual_platform_dimensions_and_duration_padding(self):
        payload = self.payload(duration=1.2)
        payload['platforms'] = list(worker.PLATFORMS)
        with tempfile.TemporaryDirectory() as temp, patch.object(worker, 'download', self.fake_download):
            results = worker.assemble(payload, Path(temp), set(), time.monotonic() + 120)
            self.assertEqual(len(results), 8)
            for platform, video, _ in results:
                info = worker.probe(video, time.monotonic() + 10)
                stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
                self.assertEqual((stream['width'], stream['height']), worker.PLATFORMS[platform])
                self.assertAlmostEqual(float(info['format']['duration']), 1.2, delta=0.08)
            self.assertEqual(results[1][1], results[2][1])  # Reuse same-size render.

    def test_trim_and_single_scene(self):
        payload = self.payload(duration=0.2)
        payload['videoClips'] = payload['videoClips'][1:]
        with tempfile.TemporaryDirectory() as temp, patch.object(worker, 'download', self.fake_download), patch.dict(worker.PLATFORMS, youtube=(320, 180)):
            result = worker.assemble(payload, Path(temp), set(), time.monotonic() + 60)
            info = worker.probe(result[0][1], time.monotonic() + 10)
            self.assertAlmostEqual(float(info['format']['duration']), 0.2, delta=0.05)

    def test_corrupt_scene_fails(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(worker, 'download', lambda url, path, *a, **k: path.write_text('broken')):
            with self.assertRaises(RuntimeError):
                worker.assemble(self.payload(), Path(temp), set(), time.monotonic() + 10)


class BoundaryTests(unittest.TestCase):
    def test_reject_unsafe_urls_and_redirects(self):
        for url in ['file:///etc/passwd', 'http://media.test/a', 'https://evil.test/a', 'https://user:pass@media.test/a']:
            with self.assertRaises(ValueError):
                worker.validate_url(url, {'media.test'})
        with patch.object(worker.socket, 'getaddrinfo', return_value=[(0, 0, 0, '', ('127.0.0.1', 443))]):
            with self.assertRaises(ValueError):
                worker.validate_url('https://media.test/a', {'media.test'})
        with self.assertRaises(ValueError):
            worker.SafeRedirect({'media.test'}).redirect_request(None, None, 302, '', {}, 'http://localhost/a')

    def test_inline_tts_audio_supported(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / 'audio'
            worker.download('data:audio/mp3;base64,' + base64.b64encode(b'audio').decode(), file, set(), True)
            self.assertEqual(file.read_bytes(), b'audio')

    def test_worker_uploads_before_committing_completion(self):
        class DB:
            def __init__(self):
                self.uploads = []
            def upload(self, path, file, mime):
                self.uploads.append((path, mime))
                return 'https://storage.test/' + path
            def rpc(self, name, data):
                self.data = data
        db = DB()
        with patch.object(worker, 'assemble', return_value=[('youtube', Path('video'), Path('thumb'))]):
            worker.process_job(db, {'id': 'job', 'lease_token': 'lease', 'video_generation_id': 'generation', 'input': {}}, set())
        self.assertEqual([mime for _, mime in db.uploads], ['video/mp4', 'image/jpeg'])
        self.assertIsNone(db.data['failure'])
        self.assertEqual(db.data['videos'][0]['aspectRatio'], '16:9')
        self.assertIn('generation/job/lease/', db.data['videos'][0]['url'])

    def test_worker_reports_failures_and_cleans_temp_files(self):
        class DB:
            def rpc(self, name, data):
                self.name, self.data = name, data
        db = DB()
        paths = []
        def fail(payload, directory, *args):
            paths.append(directory)
            raise RuntimeError('bad input')
        with patch.object(worker, 'assemble', fail), self.assertLogs(level='ERROR'):
            worker.process_job(db, {'id': 'id', 'lease_token': 'token', 'input': {}}, set())
        self.assertEqual(db.name, 'finish_video_export')
        self.assertEqual(db.data['token'], 'token')
        self.assertIsNotNone(db.data['failure'])
        self.assertFalse(paths[0].exists())


if __name__ == '__main__':
    unittest.main()
