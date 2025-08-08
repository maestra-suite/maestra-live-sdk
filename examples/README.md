# Maestra SDK Examples

This directory contains example implementations demonstrating how to use the Maestra Client SDK.

## CLI Client (`run_maestra_client.js`)

A comprehensive command-line interface for the Maestra SDK that supports multiple audio sources and real-time transcription with translation capabilities.

### Features

- **Multiple Audio Sources**: Microphone, local files, HLS, RTMP/S, RTSP, and SRT streams
- **Real-time Transcription**: Live speech-to-text with interim and finalized results
- **Translation Support**: Real-time translation to 95+ supported languages
- **Language Detection**: Automatic source language detection
- **Dashboard Integration**: Save transcriptions to your Maestra dashboard
- **Flexible Configuration**: Support for custom servers and connection settings
- **Clean CLI Interface**: User-friendly command-line experience with detailed feedback

### Prerequisites

1. **Node.js**: Version 14 or higher
2. **Maestra API Key**: Get your API key from the Maestra dashboard
3. **SDK Dependencies**: Install the required packages

```bash
# Install SDK dependencies
npm install

# Or if using globally
npm install -g @maestra-ai/maestra-client-sdk
```

### Basic Usage

#### Microphone Transcription

**Simple transcription (English):**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY
```

**With language specification:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage en
```

**Auto-detect language:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage auto
```

#### File Transcription

**Basic file transcription:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --file path/to/audio.wav
```

**File with language detection:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --file audio.mp3 --sourceLanguage auto
```

**File with specific language:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --file video.mp4 --sourceLanguage es
```

#### Stream Transcription

**HLS Stream:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --hls_url https://example.com/stream.m3u8
```

**RTMP/RTMPS Stream:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --rtmps_url rtmp://localhost:1935/live/stream
```

**RTSP Stream:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --rtsp_url rtsp://example.com:554/stream
```

**SRT Stream:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --srt_url "srt://localhost:9999?mode=caller"
```

### Translation Examples

#### Real-time Translation

**English to French:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage en --targetLanguage fr --translationEnabled true
```

**Auto-detect to Spanish:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage auto --targetLanguage es --translationEnabled true
```

**Japanese to English (with file):**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --file audio.wav --sourceLanguage ja --targetLanguage en --translationEnabled true
```

**German to English (with HLS stream):**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --hls_url https://german-stream.com/live.m3u8 --sourceLanguage de --targetLanguage en --translationEnabled true
```

### Advanced Configuration

#### Save to Dashboard

Save your transcription session to the Maestra dashboard:

```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage en --targetLanguage fr --translationEnabled true --saveToDashboard true
```

#### Custom Server Configuration

Connect to a local or custom Maestra server:

```bash
# Local development server
node examples/run_maestra_client.js --apikey YOUR_API_KEY --host localhost --port 9091 --secure false

# Custom server with SSL
node examples/run_maestra_client.js --apikey YOUR_API_KEY --host custom.example.com --port 443 --secure true
```

#### Complete Example with All Options

```bash
node examples/run_maestra_client.js \
  --apikey YOUR_API_KEY \
  --file "conference-call.mp4" \
  --sourceLanguage auto \
  --targetLanguage en \
  --translationEnabled true \
  --saveToDashboard true \
  --host wlive2.maestra.ai \
  --port 443 \
  --secure true
```

### Command Line Options

| Option | Alias | Type | Description | Required | Default |
|--------|-------|------|-------------|----------|---------|
| `--apikey` | `-ak` | string | Maestra API key for authentication | ✅ Yes | - |
| `--translationEnabled` | `-te` | boolean | Enable real-time translation | ✅ Yes | - |
| `--sourceLanguage` | `-sl` | string | Source language ('auto', 'en', 'fr', etc.) | No | Auto-detect |
| `--targetLanguage` | `-tl` | string | Target language for translation | No | - |
| `--saveToDashboard` | `-sd` | boolean | Save transcription to dashboard | No | `false` |
| `--file` | - | string | Local audio/video file path | No | - |
| `--hls_url` | - | string | HLS stream URL | No | - |
| `--rtmps_url` | - | string | RTMP/S stream URL | No | - |
| `--rtsp_url` | - | string | RTSP stream URL | No | - |
| `--srt_url` | - | string | SRT stream URL | No | - |
| `--host` | - | string | Server hostname | No | `wlive2.maestra.ai` |
| `--port` | - | number | Server port | No | `443` |
| `--secure` | - | boolean | Use WSS connection | No | `true` |

### Supported Languages

**Popular language codes:**
- `en` (English)
- `fr` (French) 
- `es` (Spanish)
- `de` (German)
- `it` (Italian)
- `ja` (Japanese)
- `ko` (Korean)
- `zh` (Chinese)
- `ru` (Russian)
- `pt` (Portuguese)
- `ar` (Arabic)
- `hi` (Hindi)
- `tr` (Turkish)
- `nl` (Dutch)
- `pl` (Polish)

**Special values:**
- `auto` - Automatic language detection

> **Note**: Use `auto` for the source language to enable automatic detection. The system supports 95+ languages for both transcription and translation.

### Output Format

The CLI provides real-time feedback with detailed information:

```
📋 Client Configuration:
   🔑 API Key: sk-1234...
   🌐 Host: wlive2.maestra.ai
   🔌 Port: 443
   🔒 Secure: true
🗣️  Source language set to: auto
🌐 Target language set to: fr
🌐 Translation enabled
💾 Will save transcription to dashboard after session

Initializing Maestra Client...
Attempting to connect to the server...
✅ Client is ready and connected to the server.

================================================
   LANGUAGE DETECTED: ENGLISH   
================================================

🔴 Transcription started. Listening for audio...
👂 Original: Hello everyone welcome to today's meeting
🌐 Translating: Bonjour tout le monde, bienvenue à la réunion d'aujourd'hui
✅ Original: Hello everyone, welcome to today's meeting [0.5s -> 2.8s]
✅ Translated: Bonjour tout le monde, bienvenue à la réunion d'aujourd'hui [0.5s -> 2.8s]
```

### Error Handling

The CLI includes comprehensive error handling:

**Authentication errors:**
```
❌ Authentication failed. Please check your API key.
```

**Connection errors:**
```
❌ Failed to connect to server. Please check your network connection.
```

**Audio source errors:**
```
❌ Failed to process audio source. Please verify the file path or stream URL.
```

**Language errors:**
```
❌ Unsupported language code. Please use a valid language code or 'auto'.
```

### Integration Examples

This CLI demonstrates key SDK integration patterns:

1. **Event-Driven Architecture**: Shows how to handle all SDK events properly
2. **Multiple Audio Sources**: Demonstrates processor selection and initialization
3. **Error Handling**: Comprehensive error handling with user feedback
4. **Graceful Shutdown**: Proper cleanup on CTRL+C interruption
5. **Configuration Management**: Command-line argument parsing and validation
6. **Real-time Processing**: Live audio processing with interim and final results

### Development and Testing

#### Using with Different Audio Sources

**Test with sample files:**
```bash
# Download a sample audio file
wget https://example.com/sample.wav

# Test transcription
node examples/run_maestra_client.js --apikey YOUR_API_KEY --file sample.wav
```

**Test with live streams:**
```bash
# Test with a public HLS stream
node examples/run_maestra_client.js --apikey YOUR_API_KEY --hls_url https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8
```

#### Local Development

For local development with a Maestra development server:

```bash
node examples/run_maestra_client.js \
  --apikey YOUR_DEV_API_KEY \
  --host localhost \
  --port 5901 \
  --secure false \
  --sourceLanguage en
```

### Troubleshooting

**Common Issues:**

1. **API Key Issues**: Ensure your API key is valid and has proper permissions
2. **Network Issues**: Check firewall settings and network connectivity
3. **Audio Issues**: Verify audio sources contain speech and are accessible
4. **Stream Issues**: Ensure streaming URLs are active and publicly accessible
5. **Permission Issues**: Make sure you have microphone permissions for local audio

**Debug Mode:**

Add additional logging by modifying the client configuration or checking the console output for detailed error messages.

### Next Steps

- Explore the [main SDK documentation](../README.md) for programmatic usage
- Check the [Web Demo](../demo/README.md) for a graphical interface  
- Review the [audio processors](../lib/audio-processors/) for custom implementations
- Visit the Maestra dashboard to manage your API keys and view saved transcriptions


## vMix Integration (`run_vmix_integration.js`)

This example demonstrates how to send live transcription results as captions to vMix. It uses the `VmixProcessor` to format text and send it to a Title input in vMix via its Web Controller API.

### Usage

1.  **Configure vMix**:
    *   **Recommended**: Add the provided caption template by clicking `Add Input` > `Title` > `Browse` and selecting the `examples/vmix_caption_template.xaml` file. This is required for the script's auto-discovery feature to work.
    *   Ensure the vMix Web Controller is enabled in `Settings` > `Web Controller`.
2.  **Run the script from your terminal**:
    ```bash
    node examples/run_vmix_integration.js --apiKey "YOUR_API_KEY" --vmixAddress "http://<VMIX_IP_ADDRESS>:8088"
    ```
    Use the `--help` flag to see all available options:
    ```bash
    node examples/run_vmix_integration.js --help
    ```

### Features

- **Real-time Captions**: Sends `interim` or `finalized` transcripts to vMix.
- **Automatic Formatting**: Creates a smooth, two-line scrolling caption effect.
- **Automatic Input Discovery**: The script will automatically find the correct Title input in vMix if you use the provided template.
- **Error Handling**: Automatically disconnects if the connection to vMix is lost.

