# Maestra SDK Examples

This directory contains example implementations demonstrating how to use the Maestra Client SDK.

## CLI Client (`run_maestra_client.js`)

A comprehensive command-line interface for the Maestra SDK that supports multiple audio sources and real-time transcription with translation capabilities.

### Features

- **Multiple Audio Sources**: Microphone, local files, HLS, RTMP/S, RTSP, and SRT streams
- **Real-time Transcription**: Live speech-to-text with interim and finalized results
- **Translation Support**: Real-time translation to any supported target language
- **Language Detection**: Automatic source language detection
- **Dashboard Integration**: Save transcriptions to your Maestra dashboard
- **Flexible Configuration**: Support for custom servers and connection settings
- **Clean CLI Interface**: User-friendly command-line experience with detailed feedback

### Prerequisites

1. **Node.js**: `^20.19.0 || ^22.12.0 || >=23`
2. **Maestra API Key**: Get your API key from the Maestra dashboard
3. **SoX** (macOS/Windows, e.g. `brew install sox`) or **alsa-utils** (Linux) for microphone input
4. **Dependencies**: The examples use the SDK from this repository. Install from the repository root and run the commands below from there:

```bash
npm install
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
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage en --targetLanguage fr
```

**Auto-detect to Spanish:**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage auto --targetLanguage es
```

**Japanese to English (with file):**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --file audio.wav --sourceLanguage ja --targetLanguage en
```

**German to English (with HLS stream):**
```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --hls_url https://german-stream.com/live.m3u8 --sourceLanguage de --targetLanguage en
```

### Advanced Configuration

#### Save to Dashboard

Save your transcription session to the Maestra dashboard:

```bash
node examples/run_maestra_client.js --apikey YOUR_API_KEY --sourceLanguage en --targetLanguage fr --saveToDashboard true
```

#### Custom Server Configuration

Connect to a local or custom Maestra server:

```bash
# Local development server
node examples/run_maestra_client.js --apikey YOUR_API_KEY --host localhost --port 9090 --secure false

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
  --saveToDashboard true \
  --host maestra-live.maestra.ai \
  --port 443 \
  --secure true
```

### Command Line Options

| Option | Alias | Type | Description | Required | Default |
|--------|-------|------|-------------|----------|---------|
| `--apikey` | `--ak` | string | Maestra API key for authentication | ✅ Yes | - |
| `--sourceLanguage` | `--sl` | string | Source language ('auto', 'en', 'fr', etc.) | No | Auto-detect |
| `--targetLanguage` | `--tl` | string | Target language; enables translation when set | No | - |
| `--saveToDashboard` | `--sd` | boolean | Save transcription to dashboard | No | `false` |
| `--file` | - | string | Local audio/video file path | No | - |
| `--hls_url` | - | string | HLS stream URL | No | - |
| `--rtmps_url` | - | string | RTMP/S stream URL | No | - |
| `--rtsp_url` | - | string | RTSP stream URL | No | - |
| `--srt_url` | - | string | SRT stream URL | No | - |
| `--host` | - | string | Server hostname | No | `maestra-live.maestra.ai` |
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

> **Note**: Use `auto` (or omit `--sourceLanguage`) for automatic detection. See the [main README](../README.md#language-configuration) for the full list of language codes.

> **Note**: Multi-letter aliases need a double dash (`--ak`, `--sl`, `--tl`, `--sd`); `-ak` is parsed as two separate flags.

### Output Format

The CLI prints the configuration, connection progress and results as they arrive:

```
Initializing Maestra Client...
📋 Client Configuration:
   🔑 API Key: YOUR_API...
   🌐 Host: maestra-live.maestra.ai
   🔌 Port: 443
   🔒 Secure: true
🗣️  Source language set to: auto
🌐 Target language set to: fr
💾 Will save transcription to dashboard
🔄 Attempting to connect to the server...
📍 Connecting to: wss://maestra-live.maestra.ai:443
✅ Client is ready and connected to the server.
```

Detected languages, interim results and finalized transcription/translation segments follow as the audio is processed.

### Error Handling

Errors reported by the SDK are printed with their message, for example an invalid API key:

```
❌ An error occurred: Connection failed: Authentication error. Please check your API key and ensure it is valid and has the necessary permissions.
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
  --port 9090 \
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

