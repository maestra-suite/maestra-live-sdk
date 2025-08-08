const MaestraClient = require("./lib/maestra-client");
const FfmpegProcessor = require("./lib/audio-processors/ffmpeg-processor");
const FileProcessor = require("./lib/audio-processors/file-processor");
const HlsProcessor = require("./lib/audio-processors/hls-processor");
const MicrophoneProcessor = require("./lib/audio-processors/microphone-processor");
const RtmpsProcessor = require("./lib/audio-processors/rtmps-processor");
const RtspProcessor = require("./lib/audio-processors/rtsp-processor");
const SrtProcessor = require("./lib/audio-processors/srt-processor");
const StreamInputProcessor = require("./lib/audio-processors/stream-input-processor");
const VmixProcessor = require("./lib/integrations/vmix-processor");

module.exports = {
  MaestraClient,
  FfmpegProcessor,
  FileProcessor,
  HlsProcessor,
  MicrophoneProcessor,
  RtmpsProcessor,
  RtspProcessor,
  SrtProcessor,
  StreamInputProcessor,
  VmixProcessor,
};
