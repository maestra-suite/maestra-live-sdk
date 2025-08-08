# Maestra SDK Web Demo

A comprehensive web-based demonstration of the Maestra SDK capabilities, showcasing real-time transcription and translation from multiple audio sources.

## Features

- **Multiple Audio Sources**: Support for microphone, HLS, RTMP/S, RTSP, and SRT streams
- **Real-time Transcription**: Live speech-to-text conversion
- **Language Selection**: Configure source language (auto-detect or specific language)
- **Translation**: Optional real-time translation to any supported target language
- **Language Detection**: Automatic source language detection when auto-detect is enabled
- **Dashboard Integration**: Save transcription sessions to your Maestra dashboard
- **Flexible Results Display**: Choose between interim and final results only
- **Modern UI**: Clean, responsive interface with tabbed navigation

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Valid Maestra API key
- Access to Maestra production server (wlive2.maestra.ai) or local development server

### Installation

1. Navigate to the demo directory:
```bash
cd maestra-client-sdk/demo
```

2. Install dependencies:
```bash
npm install
```

3. Start the demo server:
```bash
node server.js
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

**Note**: The demo is now configured to connect to the production server (wlive2.maestra.ai:443) by default. If you need to connect to a local development server, you'll need to modify the configuration in `demo/public/client.js`.

## Usage

### Authentication and Configuration

1. **API Key**: Enter your Maestra API key in the "API Key" field
2. **Source Language**:
   - Choose "Auto-detect" for automatic language detection
   - Or select a specific language if you know the audio language
3. **Translation Settings**:
   - Check "Enable Translation" to show the target language selector
   - Choose your desired target language from the dropdown
   - Translation will convert the source language to your selected target language
4. **Display Options**:
   - **Show Interim Results**: Display real-time partial transcription (enabled by default)
   - **Save to Dashboard**: Save your transcription session to the Maestra dashboard for later review

### Audio Sources

#### Microphone
- Click "Start Transcription" to begin capturing from your microphone
- Grant microphone permissions when prompted

#### HLS Streams
- Enter an HLS URL (`.m3u8` format)
- Example: `http://localhost:8080/hls_output/stream.m3u8`

#### RTMP/S Streams
- Enter an RTMP or RTMPS URL
- Example: `rtmp://localhost:1935/live/stream`

#### RTSP Streams
- Enter an RTSP URL
- Example: `rtsp://localhost:8554/live/stream`

#### SRT Streams
- Enter an SRT URL with mode parameter
- Example: `srt://localhost:9999?mode=caller`

## Stream Setup Examples

### HLS Stream from Local File

1. Create HLS stream using FFmpeg:
```bash
ffmpeg -stream_loop -1 -re -i your-audio-file.wav -c:a aac -b:a 128k -f hls -hls_time 4 -hls_list_size 5 hls_output/stream.m3u8
```

2. Serve with HTTP server:
```bash
npx http-server . -p 8080 --cors
```

3. Use URL: `http://localhost:8080/hls_output/stream.m3u8`

### RTMP Stream with MediaMTX

1. Start MediaMTX server:
```bash
docker run -d -p 8554:8554 -p 1935:1935 --name rtsp-server bluenviron/mediamtx
```

2. Stream to RTMP:
```bash
ffmpeg -stream_loop -1 -re -i your-audio-file.wav -c:a aac -b:a 128k -f flv rtmp://localhost:1935/live/stream
```

3. Use RTMP URL: `rtmp://localhost:1935/live/stream`
4. Or RTSP URL: `rtsp://localhost:8554/live/stream`

### SRT Stream

1. Create SRT listener:
```bash
ffmpeg -stream_loop -1 -re -i your-audio-file.wav -c:a aac -b:a 128k -f mpegts srt://localhost:9999?mode=listener
```

2. Use URL: `srt://localhost:9999?mode=caller`

## Interface Elements

### Language Controls
- **Source Language Selector**: Choose "Auto-detect" or select a specific source language
- **Translation Toggle**: Enable/disable real-time translation
- **Target Language Selector**: Choose target language for translation (visible when translation is enabled)

### Language Information Display
- **Detected Language**: Shows the automatically detected language (when auto-detect is used)
- **Translation Status**: Indicates current translation configuration

### Status Messages
- Connection status and processing information
- Source-specific messages (e.g., "Starting HLS stream processing")

### Transcription Output
- **Original Transcription**: Shows transcribed text in source language
- **Translation**: Shows English translation when enabled
- **Interim Results**: Real-time partial results (can be toggled)

## Technical Details

### Audio Processing
- Input audio is resampled to 16kHz mono for optimal transcription
- Uses Web Audio API with AudioWorklet for efficient processing
- Fallback to ScriptProcessorNode for older browsers

### WebSocket Communication
- Real-time bidirectional communication with Maestra servers
- Automatic reconnection handling
- Binary audio data transmission

### Supported Formats
- **Audio Codecs**: AAC, MP3, WAV, FLAC
- **Streaming Protocols**: HLS, RTMP/S, RTSP, SRT
- **Sample Rates**: Automatic resampling from any rate to 16kHz

### Supported Languages
- **Source Languages**: English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Turkish, Dutch, Polish, and more
- **Target Languages**: Same as source languages for translation
- **Auto-detection**: Automatic language detection for unknown source audio

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**
   - Check browser permissions
   - Ensure HTTPS connection for production

2. **Stream Connection Failed**
   - Verify stream URL is accessible
   - Check firewall/network settings
   - Ensure stream is actively broadcasting

3. **No Transcription Output**
   - Verify audio contains speech
   - Check audio levels and quality
   - Ensure valid API key

4. **Translation Not Working**
   - Ensure "Enable Translation" is checked
   - Verify source language is supported
   - Check network connectivity

### Debug Information

The demo includes comprehensive error handling and status reporting. Check the browser console for detailed error messages and the status log in the interface for real-time information.

## API Integration

This demo showcases the Maestra SDK's capabilities. For production integration:

1. Replace demo authentication with your production API keys
2. Customize the UI to match your application
3. Add error handling specific to your use case
4. Consider implementing user management and session handling

## License

This demo is part of the Maestra SDK and follows the same licensing terms. 