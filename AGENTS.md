# AGENTS.md

Guidance for `maestra-live-sdk`, the public Node.js SDK (`@maestra-ai/live-sdk`,
MIT) that streams audio to the Maestra Live server over WebSocket and emits
transcription, translation and voiceover events. Maintained against `main`.

## Agent instructions

- This file is the single source of instructions for every coding agent (Codex, Claude Code, Cursor and others). `CLAUDE.md` contains only `@AGENTS.md`; keep rules here, never in `CLAUDE.md` or tool-specific rule files.
- Before starting work, read `../AGENTS.md` (the Maestra workspace guidance) if it exists. It lives outside this repository, so Codex does not discover it on its own; if it is absent, proceed with this file.
- Before editing a file, read any nested `AGENTS.md` along its path; the more specific file wins where rules conflict.

## Commands

- Node `^20.19.0 || ^22.12.0 || >=23` (`engines` in `package.json`).
- `npm test` runs `node --test tests/*.test.js`. `tests/maestra-client.test.js`
  uses a local fake WebSocket server, so it needs no API key or network; the
  `FileProcessor`/`FfmpegProcessor` cases need the `ffmpeg-static` binary from
  `node_modules`. Run one case with `node --test --test-name-pattern "<name>" tests/maestra-client.test.js`.
- `npm run docs:generate` regenerates the committed JSDoc HTML in `docs/`
  (config `jsdoc.json`); `npm run docs` also opens it.
- `node demo/server.js` serves the browser demo on `http://localhost:3000`;
  `node examples/run_maestra_client.js --apikey <key> [--file|--hls_url|...]`
  is the CLI (`--host`/`--port`/`--secure` override the server). Both default to
  the production live server and spend the API key owner's real minutes.
- `npm run release` runs `npm publish --access public`. It publishes to the
  public npm registry; never run it (see Release).
- There is no lint or build step.

## Architecture

- `index.js` is the public export list. Adding or removing an export is a
  public API change.
- `lib/maestra-client.js` (`MaestraClient`): user-facing `EventEmitter`. Wraps
  `WebSocketClient`, wires a processor's `onAudioCallback`/`onErrorCallback`/
  `onEndCallback`, and re-emits kebab-case events (`ready`,
  `interim-transcription`, `finalized-transcription`, `interim-translation`,
  `finalized-translation`, `language-detected`, `finalized-segment-audio-url`,
  `source-ended`, `voiceover-*`, `transcription-started`/`-stopped`).
  Default host `maestra-live.maestra.ai`, port 443, `secure: true`.
- `lib/websocket-client.js`: handshake, message parsing and camelCase internal
  events. Reads `name`/`version` from `package.json` for the `User-Agent`
  header and `sdkVersion`.
- `lib/audio-processors/`: `FfmpegProcessor` is abstract; subclasses (`File`,
  `Hls`, `Rtmps`, `Rtsp`, `Srt`) only override `_getInputOptions()`.
  `MicrophoneProcessor` uses `node-microphone` (SoX/alsa) and resamples to
  16 kHz; `StreamInputProcessor` takes pushed f32le buffers (used by the demo).
- `lib/integrations/vmix-processor.js` (`VmixProcessor`): pushes caption text
  to a vMix Web Controller (`SetText`); it is an output, not an audio source.
- `demo/` (Express + browser UI) and `examples/` are repo-only; `.npmignore`
  and the `files` whitelist in `package.json` keep them out of the package.

## Cross-repository contracts

The SDK talks only to `../maestra-live-server` (`server.js`, the
`wss.on('connection')` handler). Verify both sides before changing any of this:

- Handshake: the first text frame is JSON with `authorization: "Bearer <apiKey>"`,
  `uid`, `use_vad`, `clientType: 'sdk'`, `sdkVersion`, and, only when set,
  `sourceLanguage`, `targetLanguage`, `saveToDashboard`, `translationEnabled`,
  `voiceOverEnabled`, `voiceId`, `autoVoiceCloning`, `room_id` (from the
  `roomId` option), `eventMode` and `confirmEventStart`. The server authenticates
  the Bearer value with `apiKeyToUid` (`apiKeys/<key>` in Firebase).
- With `room_id`, the server hosts that room for the key's owner. Event rooms
  use the room's languages, not `targetLanguage`; they default to a rehearsal,
  and `eventMode: 'event'` needs `confirmEventStart: true`. The server sends
  `{type: "event_access", eventMode, endsAt, event}` before `SERVER_READY`, and
  refusals as `{status: "ERROR", code, message}`.
- For API-key sessions that send a `targetLanguage`, the client's language pair
  wins over the user's saved captioner settings; without one, the saved
  `sourceLanguage` and translation settings apply. A boolean `saveToDashboard`
  decides whether audio is saved (`server.js`, `clientTargetLanguage` and
  `clientSaveAudio`).
- The server currently reads none of `use_vad`, `voiceId`, `voiceOverEnabled`,
  `autoVoiceCloning`, `uid` or `sdkVersion`; voiceover comes from the user's
  saved `voiceover` settings. `clientType` is forwarded only to Whisper Live.
  Do not document these options as server-enforced without a server change.
- Audio: binary frames of mono 32-bit float PCM at 16 kHz. The SDK sends no
  `sampleRate`, so it relies on the server's 16000 fallback; if you change the
  rate, send `sampleRate` in the handshake. Audio is dropped until `SERVER_READY`.
- Server frames handled: `{message: "SERVER_READY"}`, `{status: "ERROR", message}`,
  `segments`/`translated_segments` (interim), `segment`/`translated_segment`
  (final), `{type: "audio", audio_url}` (voiceover). `status: "WAIT"` and
  `message: "DISCONNECT"` are legacy: the current server sends neither, but
  keep handling them for older deployments.
- `README.md` points users to `https://companion.maestrasuite.com/api/listVoices`
  (served by `../maestra-companion`) for voice IDs.

## Conventions

- CommonJS, 2-space indent, JSDoc on public classes and options (it feeds `docs/`).
- Keep backward compatibility: the legacy `language` option aliases
  `sourceLanguage`, and event names are public API.
- A fatal processor error stops the whole session so the server stops
  streaming and billing; an intentional `stop()` is never reported as an error.
- `MAESTRA_FFMPEG_PATH` replaces the bundled FFmpeg process-wide (needed for SRT).
- Never log API keys or raw audio (removed from the demo in `ceab0e6`).
- Add user-visible changes to `CHANGELOG.md` under a new version heading and
  keep `README.md` in step with behavior.

## Release

- Releases are manual: bump `version` in `package.json` (and the lockfile),
  add the `CHANGELOG.md` entry, then the owner runs `npm run release`. There is
  no CI or publish workflow. Agents describe or prepare a release; they never
  publish, tag or bump the version unless asked.
- `docs/` is generated output; regenerate it rather than editing the HTML.

## Working tree safety

- Check `git status --short --branch` first; preserve unrelated changes and
  do not use destructive Git commands unless the user asks.
- Never commit API keys; demo and examples take keys from arguments or the UI.
