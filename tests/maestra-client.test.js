const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { MaestraClient, StreamInputProcessor } = require('..');

// Fake Maestra server: `script(ws, config)` drives the reply to the handshake.
function fakeServer(script) {
  return new Promise(resolve => {
    const wss = new WebSocket.Server({ port: 0 }, () => resolve({ wss, port: wss.address().port }));
    wss.on('connection', (ws, req) => {
      ws.once('message', m => script(ws, JSON.parse(m), req));
    });
  });
}
const client = (port, extra = {}) =>
  new MaestraClient({ apiKey: 'k', host: 'localhost', port, secure: false, connectionTimeout: 800, ...extra });
const once = (em, ev, ms = 2000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`timeout waiting ${ev}`)), ms);
  em.once(ev, v => { clearTimeout(t); res(v); });
});

test('handshake payload', async () => {
  let got, ua;
  const { wss, port } = await fakeServer((ws, cfg, req) => { got = cfg; ua = req.headers['user-agent']; ws.send(JSON.stringify({ message: 'SERVER_READY' })); });
  const c = client(port, { sourceLanguage: 'en', targetLanguage: 'tr', voiceId: 'V1', saveToDashboard: true });
  c.connect(); await once(c, 'ready'); c.stop(); wss.close();
  assert.strictEqual(got.authorization, 'Bearer k');
  assert.strictEqual(got.sourceLanguage, 'en');
  assert.strictEqual(got.targetLanguage, 'tr');
  assert.strictEqual(got.translationEnabled, true);
  assert.strictEqual(got.voiceOverEnabled, true);
  assert.strictEqual(got.voiceId, 'V1');
  assert.strictEqual(got.saveToDashboard, true);
  assert.strictEqual(got.clientType, 'sdk');
  assert.match(ua, /^@maestra-ai\/live-sdk\/\d/);
});

test('no targetLanguage -> translation disabled, no language keys', async () => {
  let got;
  const { wss, port } = await fakeServer((ws, cfg) => { got = cfg; ws.send(JSON.stringify({ message: 'SERVER_READY' })); });
  const c = client(port); c.connect(); await once(c, 'ready'); c.stop(); wss.close();
  assert.strictEqual(got.translationEnabled, false);
  assert.ok(!('targetLanguage' in got) && !('sourceLanguage' in got));
});

test('useVad is forwarded, defaults to true', async () => {
  const seen = [];
  const { wss, port } = await fakeServer((ws, cfg) => { seen.push(cfg.use_vad); ws.send(JSON.stringify({ message: 'SERVER_READY' })); });
  for (const extra of [{ useVad: false }, {}]) {
    const c = client(port, extra); c.connect(); await once(c, 'ready'); c.stop();
  }
  wss.close();
  assert.deepStrictEqual(seen, [false, true]);
});

test('getTranscriptionData collects received segments', async () => {
  const { wss, port } = await fakeServer(ws => {
    ws.send(JSON.stringify({ message: 'SERVER_READY' }));
    ws.send(JSON.stringify({ segments: [{ text: 'old', completed: false }] }));
    ws.send(JSON.stringify({ segments: [{ text: 'new', completed: false }] }));
    ws.send(JSON.stringify({ translated_segments: [{ text: 'tnew' }] }));
    ws.send(JSON.stringify({ segment: { text: 'f1' } }));
    ws.send(JSON.stringify({ segment: { text: 'f2' } }));
    ws.send(JSON.stringify({ translated_segment: { text: 'tf1' } }));
  });
  const c = client(port);
  c.connect(); await once(c, 'ready');
  await new Promise(r => setTimeout(r, 300)); c.stop(); wss.close();
  const d = c.getTranscriptionData();
  assert.deepStrictEqual(d.interimTranscription.map(s => s.text), ['new']);
  assert.deepStrictEqual(d.interimTranslation.map(s => s.text), ['tnew']);
  assert.deepStrictEqual(d.finalizedTranscription.map(s => s.text), ['f1', 'f2']);
  assert.deepStrictEqual(d.finalizedTranslation.map(s => s.text), ['tf1']);
});

test('server messages map to events', async () => {
  const { wss, port } = await fakeServer(ws => {
    ws.send(JSON.stringify({ message: 'SERVER_READY' }));
    ws.send(JSON.stringify({ segments: [{ text: 'a', completed: true }, { text: 'b', completed: false }] }));
    ws.send(JSON.stringify({ translated_segments: [{ text: 'tb' }] }));
    ws.send(JSON.stringify({ segment: { text: 'fin', start: 0, end: 1 } }));
    ws.send(JSON.stringify({ translated_segment: { text: 'tfin' } }));
    ws.send(JSON.stringify({ type: 'audio', audio_url: 'http://x/a.mp3' }));
  });
  const c = client(port);
  const ev = {};
  for (const e of ['interim-transcription', 'interim-translation', 'finalized-transcription', 'finalized-translation', 'finalized-segment-audio-url'])
    c.on(e, v => (ev[e] = v));
  c.connect(); await once(c, 'ready');
  await new Promise(r => setTimeout(r, 300)); c.stop(); wss.close();
  assert.deepStrictEqual(ev['interim-transcription'].map(s => s.text), ['b']);
  assert.strictEqual(ev['interim-translation'][0].text, 'tb');
  assert.strictEqual(ev['finalized-transcription'].text, 'fin');
  assert.strictEqual(ev['finalized-translation'].text, 'tfin');
  assert.strictEqual(ev['finalized-segment-audio-url'], 'http://x/a.mp3');
});

test('language detected when sourceLanguage not set', async () => {
  const { wss, port } = await fakeServer(ws => { ws.send(JSON.stringify({ message: 'SERVER_READY' })); ws.send(JSON.stringify({ language: 'de' })); });
  const c = client(port); c.connect();
  assert.strictEqual(await once(c, 'language-detected'), 'de'); c.stop(); wss.close();
});

test('language detected with sourceLanguage auto', async () => {
  const { wss, port } = await fakeServer(ws => { ws.send(JSON.stringify({ message: 'SERVER_READY' })); ws.send(JSON.stringify({ language: 'de' })); });
  const c = client(port, { sourceLanguage: 'auto' }); c.connect();
  assert.strictEqual(await once(c, 'language-detected', 1000), 'de'); c.stop(); wss.close();
});

test('DISCONNECT emits disconnect', async () => {
  const { wss, port } = await fakeServer(ws => { ws.send(JSON.stringify({ message: 'SERVER_READY' })); ws.send(JSON.stringify({ message: 'DISCONNECT' })); });
  const c = client(port); c.connect(); await once(c, 'disconnect'); wss.close();
});

test('missing api key errors', async () => {
  const c = new MaestraClient({ host: 'localhost', port: 1, secure: false });
  c.connect(); assert.match((await once(c, 'error')).message, /Invalid or missing API key/);
});

test('ERROR auth message', async () => {
  const { wss, port } = await fakeServer(ws => ws.send(JSON.stringify({ status: 'ERROR', message: 'Authentication failed' })));
  const c = client(port); c.connect();
  assert.match((await once(c, 'error')).message, /Authentication error/); c.stop(); wss.close();
});

test('WAIT message errors', async () => {
  const { wss, port } = await fakeServer(ws => ws.send(JSON.stringify({ status: 'WAIT', message: 'busy' })));
  const c = client(port); c.connect();
  assert.strictEqual((await once(c, 'error')).message, 'busy'); c.stop(); wss.close();
});

test('timeout without SERVER_READY', async () => {
  const { wss, port } = await fakeServer(() => {});
  const c = client(port); c.connect();
  assert.match((await once(c, 'error')).message, /Timeout/); c.stop(); wss.close();
});

test('connection refused errors', async () => {
  const c = client(1); c.connect();
  await once(c, 'error');
});

test('transcribe before ready errors', async () => {
  const c = client(1); c.on('error', () => {});
  const p = once(c, 'error'); c.transcribe(new StreamInputProcessor());
  assert.match((await p).message, /Not connected/);
});

test('audio flows, double transcribe errors, stop', async () => {
  let bytes = 0;
  const { wss, port } = await fakeServer(ws => { ws.send(JSON.stringify({ message: 'SERVER_READY' })); ws.on('message', m => (bytes += m.length)); });
  const c = client(port); c.connect(); await once(c, 'ready');
  const p = new StreamInputProcessor();
  c.transcribe(p);
  p.pushAudio(Buffer.from(new Float32Array(1600).buffer));
  const err = once(c, 'error'); c.transcribe(new StreamInputProcessor());
  assert.match((await err).message, /Already transcribing/);
  await new Promise(r => setTimeout(r, 200));
  const stopped = once(c, 'transcription-stopped'); c.stop(); await stopped;
  assert.strictEqual(bytes, 6400); assert.strictEqual(c.isTranscribing, false);
  wss.close();
});

test('reconnect after stop', async () => {
  const { wss, port } = await fakeServer(ws => ws.send(JSON.stringify({ message: 'SERVER_READY' })));
  const c = client(port);
  c.connect(); await once(c, 'ready'); c.stop();
  c.connect(); await once(c, 'ready'); c.stop(); wss.close();
});

test('language-detected fires again when language changes, not for repeats', async () => {
  const { wss, port } = await fakeServer(ws => {
    ws.send(JSON.stringify({ message: 'SERVER_READY' }));
    for (const l of ['en', 'en', 'de']) ws.send(JSON.stringify({ language: l, language_prob: 1 }));
  });
  const c = client(port, { sourceLanguage: 'auto' });
  const got = []; c.on('language-detected', l => got.push(l));
  c.connect(); await once(c, 'ready'); await new Promise(r => setTimeout(r, 200)); c.stop(); wss.close();
  assert.deepStrictEqual(got, ['en', 'de']);
});

test('no language-detected when source language is pinned', async () => {
  const { wss, port } = await fakeServer(ws => { ws.send(JSON.stringify({ message: 'SERVER_READY' })); ws.send(JSON.stringify({ language: 'de' })); });
  const c = client(port, { sourceLanguage: 'en' });
  let fired = false; c.on('language-detected', () => (fired = true));
  c.connect(); await once(c, 'ready'); await new Promise(r => setTimeout(r, 200)); c.stop(); wss.close();
  assert.strictEqual(fired, false);
});

test('processor error stops the session and closes the socket', async () => {
  let closed;
  const serverClosed = new Promise(r => (closed = r));
  const { wss, port } = await fakeServer(ws => { ws.send(JSON.stringify({ message: 'SERVER_READY' })); ws.on('close', closed); });
  const c = client(port); c.connect(); await once(c, 'ready');
  const failing = { start() { setTimeout(() => this.onErrorCallback(new Error('boom')), 10); return Promise.resolve(); }, stop() { this.stopped = true; } };
  const err = once(c, 'error'); const stopped = once(c, 'transcription-stopped');
  c.transcribe(failing);
  assert.strictEqual((await err).message, 'boom');
  await stopped; await serverClosed;
  assert.strictEqual(c.isTranscribing, false); assert.strictEqual(failing.stopped, true);
  wss.close();
});

test('language-detected from finalized segment language', async () => {
  const { wss, port } = await fakeServer(ws => {
    ws.send(JSON.stringify({ message: 'SERVER_READY' }));
    ws.send(JSON.stringify({ segment: { text: 'hi', language: 'en' } }));
    ws.send(JSON.stringify({ segment: { text: 'again', language: 'en' } }));
  });
  const c = client(port, { sourceLanguage: 'auto' });
  const got = [], finals = [];
  c.on('language-detected', l => got.push(l)); c.on('finalized-transcription', s => finals.push(s.text));
  c.connect(); await once(c, 'ready'); await new Promise(r => setTimeout(r, 200)); c.stop(); wss.close();
  assert.deepStrictEqual(got, ['en']); assert.deepStrictEqual(finals, ['hi', 'again']);
});

test('frame with top-level language still delivers translation and disconnect', async () => {
  const { wss, port } = await fakeServer(ws => {
    ws.send(JSON.stringify({ message: 'SERVER_READY' }));
    ws.send(JSON.stringify({ language: 'de', translated_segment: { text: 'hallo' } }));
    ws.send(JSON.stringify({ language: 'de', message: 'DISCONNECT' }));
  });
  const c = client(port, { sourceLanguage: 'en' });
  const translations = []; c.on('finalized-translation', s => translations.push(s.text));
  c.connect();
  try {
    await once(c, 'disconnect');
    assert.deepStrictEqual(translations, ['hallo']);
  } finally {
    c.stop(); wss.close();
  }
});

// Writes `seconds` of 16 kHz mono 16-bit silence to a temp WAV and returns its path.
function silentWav(seconds, name) {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const data = Buffer.alloc(seconds * 16000 * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(16000, 24); header.writeUInt32LE(32000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  const file = path.join(os.tmpdir(), `maestra-sdk-${name}-${process.pid}.wav`);
  fs.writeFileSync(file, Buffer.concat([header, data]));
  return file;
}

test('FileProcessor reports audio duration on end', async () => {
  const { FileProcessor } = require('..');
  const file = silentWav(2, 'duration');
  try {
    const ended = new Promise(resolve => {
      const p = new FileProcessor(file, { onEnd: resolve });
      p.start();
    });
    const { durationSeconds } = await Promise.race([ended, new Promise((_, rej) => setTimeout(() => rej(new Error('no end')), 5000))]);
    assert.ok(Math.abs(durationSeconds - 2) < 0.05, `durationSeconds=${durationSeconds}`);
  } finally {
    require('fs').unlinkSync(file);
  }
});

test('FfmpegProcessor stopped right after start leaves no FFmpeg running', async () => {
  const { execSync } = require('child_process');
  const { FfmpegProcessor } = require('..');
  class RealtimeProcessor extends FfmpegProcessor {
    _getInputOptions() { return ['-re']; }
  }
  const file = silentWav(3, 'stop');
  const running = () => {
    try { return execSync(`pgrep -f ${file}`).toString().trim().length > 0; } catch { return false; }
  };
  try {
    let chunksAfterStop = 0, stopped = false;
    const p = new RealtimeProcessor(file, { onAudio: () => { if (stopped) chunksAfterStop++; } });
    p.start();
    p.stop();
    stopped = true;
    await new Promise(r => setTimeout(r, 1500));
    assert.strictEqual(running(), false, 'FFmpeg still running after stop()');
    assert.strictEqual(chunksAfterStop, 0);
  } finally {
    require('fs').unlinkSync(file);
  }
});
