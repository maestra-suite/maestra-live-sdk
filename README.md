# Maestra Live SDK

A Node.js live SDK for connecting to Maestra's real-time transcription and translation services.

## Installation

```bash
npm install @maestra-ai/live-sdk
```

## 📦 What's Included

**In the npm package:**
- Core SDK library (`lib/` folder)
- README and license files
- TypeScript definitions

**Available separately from Maestra:**
- **Web Demo** - Production-ready web interface with modern UI
- **CLI Examples** - Command-line usage examples and scripts
- **Complete Documentation** - Comprehensive guides and tutorials

> The npm package contains only the essential SDK files to keep it lightweight. Demos and examples are available for download from Maestra.

## Quick Start: Transcribing from the Microphone

This example shows how to connect to the Maestra server and transcribe audio from your computer's microphone.

```javascript
const { MaestraClient, MicrophoneProcessor } = require('@maestra-ai/live-sdk');

// Configuration
const clientConfig = {
  apiKey: 'YOUR_API_KEY', // Replace with your actual API key
  host: 'wlive2.maestra.ai',
  port: 443,
  secure: true,
  sourceLanguage: 'en',       // Optional: Source language ('en', 'fr', 'es', 'auto', etc.)
  targetLanguage: 'fr',       // Optional: Target language for translation (automatically enables translation)
  saveToDashboard: true       // Optional: Save transcription to dashboard
};

// 1. Create a Maestra Client
const maestraClient = new MaestraClient(clientConfig);

// 2. Set up event listeners
maestraClient.on('ready', () => {
  console.log('✅ Client is ready. Starting microphone transcription...');
  try {
    const processor = new MicrophoneProcessor();
    maestraClient.transcribe(processor);
  } catch (error) {
    console.error('❌ Failed to start transcription:', error);
  }
});

maestraClient.on('interim-transcription', (segments) => {
  if (segments && Array.isArray(segments) && segments.length > 0) {
    const text = segments.map(s => s.text).join(' ');
    process.stdout.write(`\r👂 INTERIM: ${text}`);
  }
});

maestraClient.on('finalized-transcription', (segment) => {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(`✅ FINAL: ${segment.text} [${segment.start}s -> ${segment.end}s]`);
});

maestraClient.on('interim-translation', (segments) => {
  if (segments && Array.isArray(segments) && segments.length > 0) {
    const text = segments.map(s => s.text).join(' ');
    process.stdout.write(`\r🌐 TRANSLATION: ${text}`);
  }
});

maestraClient.on('finalized-translation', (segment) => {
  if (segment && segment.text) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(`✅ TRANSLATED: ${segment.text} [${segment.start}s -> ${segment.end}s]`);
  }
});

maestraClient.on('error', (error) => {
  console.error('\\n❌ An error occurred:', error.message);
});

maestraClient.on('disconnect', () => {
  console.log('\\n🔌 Client disconnected.');
});

// 3. Connect to the server
maestraClient.connect();

// To stop transcription, use Ctrl+C or call maestraClient.stop()
// Example: Stop after 30 seconds
// setTimeout(() => {
//   console.log('Stopping transcription...');
//   maestraClient.stop();
//   process.exit(0);
// }, 30000);
```

## Stream Examples

### File Transcription

Process local audio or video files:

```javascript
const { MaestraClient, FileProcessor } = require('@maestra-ai/live-sdk');

const clientConfig = {
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'en',
  targetLanguage: 'fr',
  saveToDashboard: true
};

const maestraClient = new MaestraClient(clientConfig);

maestraClient.on('ready', () => {
  console.log('✅ Starting file transcription...');
  const processor = new FileProcessor('./path/to/audio.wav');
  maestraClient.transcribe(processor);
});

// ... same event listeners as above
maestraClient.connect();
```

### HLS Stream Transcription

Transcribe HTTP Live Streaming (HLS) sources:

```javascript
const { MaestraClient, HlsProcessor } = require('@maestra-ai/live-sdk');

const clientConfig = {
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'auto',  // Auto-detect language
  targetLanguage: 'en'     // Translation automatically enabled when targetLanguage is specified
};

const maestraClient = new MaestraClient(clientConfig);

maestraClient.on('ready', () => {
  console.log('✅ Starting HLS stream transcription...');
  const processor = new HlsProcessor('https://example.com/stream.m3u8');
  maestraClient.transcribe(processor);
});

// ... event listeners
maestraClient.connect();
```

### RTSP Stream Transcription

Transcribe Real-Time Streaming Protocol (RTSP) sources:

```javascript
const { MaestraClient, RtspProcessor } = require('@maestra-ai/live-sdk');

const clientConfig = {
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'es',
  targetLanguage: 'en',
  saveToDashboard: true
};

const maestraClient = new MaestraClient(clientConfig);

maestraClient.on('ready', () => {
  console.log('✅ Starting RTSP stream transcription...');
  const processor = new RtspProcessor('rtsp://example.com:554/stream');
  maestraClient.transcribe(processor);
});

// ... event listeners
maestraClient.connect();
```

### RTMP/RTMPS Stream Transcription

Transcribe Real-Time Messaging Protocol streams:

```javascript
const { MaestraClient, RtmpsProcessor } = require('@maestra-ai/live-sdk');

const clientConfig = {
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'auto',
  targetLanguage: 'fr'
};

const maestraClient = new MaestraClient(clientConfig);

maestraClient.on('ready', () => {
  console.log('✅ Starting RTMP stream transcription...');
  const processor = new RtmpsProcessor('rtmp://example.com:1935/live/stream');
  maestraClient.transcribe(processor);
});

// ... event listeners
maestraClient.connect();
```

### SRT Stream Transcription

Transcribe Secure Reliable Transport (SRT) streams:

```javascript
const { MaestraClient, SrtProcessor } = require('@maestra-ai/live-sdk');

const clientConfig = {
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'ja',
  targetLanguage: 'en',
  saveToDashboard: true
};

const maestraClient = new MaestraClient(clientConfig);

maestraClient.on('ready', () => {
  console.log('✅ Starting SRT stream transcription...');
  const processor = new SrtProcessor('srt://example.com:9999?mode=caller');
  maestraClient.transcribe(processor);
});

// ... event listeners
maestraClient.connect();
```

### vMix Integration

Integrate real-time captions with vMix for live video production:

```javascript
const { MaestraClient, MicrophoneProcessor, VmixProcessor } = require('@maestra-ai/live-sdk');

// Configuration
const clientConfig = {
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'en',        // Source language for transcription
  targetLanguage: 'fr'         // Optional: Target language for translation
};

const vmixAddress = 'http://127.0.0.1:8088'; // vMix Web Controller URL

// 1. Initialize MaestraClient
const maestraClient = new MaestraClient(clientConfig);

// 2. Initialize Audio Processor (microphone or other source)
const audioProcessor = new MicrophoneProcessor();

// 3. Initialize VmixProcessor
const vmixProcessor = new VmixProcessor({
  vmixAddress: vmixAddress,
  useInterim: true,           // Set to true for faster, "flickering" captions
  useTranslation: false       // Set to true to send translations instead of transcriptions
});

// Initialize vMix connection
maestraClient.on('ready', async () => {
  console.log('✅ MaestraClient is connected and ready.');
  
  try {
    // Initialize the connection to vMix and auto-discover the input
    console.log('Initializing vMix connection...');
    await vmixProcessor.initialize();
    
    // Attach the VmixProcessor to the client
    vmixProcessor.attach(maestraClient);
    console.log('VmixProcessor attached. Starting transcription...');
    
    // Start transcribing
    maestraClient.transcribe(audioProcessor);
  } catch (error) {
    console.error(`❌ Failed to initialize vMix Processor: ${error.message}`);
  }
});

// Event handlers
maestraClient.on('transcription-started', () => {
  console.log('Transcription has started. Listening for audio...');
});

maestraClient.on('finalized-transcription', (segment) => {
  console.log('Finalized:', segment.text);
});

maestraClient.on('interim-transcription', (segment) => {
  if (segment.text) {
    console.log('Interim:', segment.text);
  }
});

maestraClient.on('finalized-translation', (segment) => {
  console.log('Translated:', segment.text);
});

maestraClient.on('interim-translation', (segment) => {
  if (segment.text) {
    console.log('Translating:', segment.text);
  }
});

// Error handling
vmixProcessor.on('error', (error) => {
  console.error('VmixProcessor Error:', error.message);
  maestraClient.stop();
});

maestraClient.on('error', (error) => {
  console.error('MaestraClient Error:', error);
  vmixProcessor.detach();
});

maestraClient.on('disconnect', () => {
  console.log('MaestraClient disconnected.');
  vmixProcessor.detach();
});

// Connect to the server
maestraClient.connect();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  maestraClient.stop();
  vmixProcessor.detach();
  process.exit(0);
});
```

**vMix Configuration:**
- Ensure vMix Web Controller is enabled in vMix settings
- The vMix URL typically uses port 8088 (e.g., `http://127.0.0.1:8088`)
- VmixProcessor will auto-discover the appropriate text input in vMix
- Use `useInterim: true` for faster caption updates with some flickering
- Use `useInterim: false` for more stable captions with slight delay




## Language Configuration

The SDK supports both transcription and real-time translation with flexible language configuration:

### Source Language Options

```javascript
const client = new MaestraClient({
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'en',     // Specific language code
  // sourceLanguage: 'auto', // Auto-detect language
  // sourceLanguage: null,   // Use server/user default settings
});
```

**Language Codes:** `en` (English), `es` (Spanish), `fr` (French), `de` (German), `it` (Italian), `pt` (Portuguese), `ru` (Russian), `ja` (Japanese), `ko` (Korean), `zh` (Chinese), `ar` (Arabic), `hi` (Hindi), `tr` (Turkish), `nl` (Dutch), `pl` (Polish), `af` (Afrikaans), `sq` (Albanian), `am` (Amharic), `hy` (Armenian), `az` (Azerbaijani), `eu` (Basque), `be` (Belarusian), `bn` (Bengali), `bs` (Bosnian), `bg` (Bulgarian), `ca` (Catalan), `hr` (Croatian), `cs` (Czech), `da` (Danish), `et` (Estonian), `fi` (Finnish), `gl` (Galician), `ka` (Georgian), `el` (Greek), `gu` (Gujarati), `he` (Hebrew), `hu` (Hungarian), `is` (Icelandic), `id` (Indonesian), `jv` (Javanese), `kn` (Kannada), `kk` (Kazakh), `km` (Khmer), `lo` (Lao), `la` (Latin), `lv` (Latvian), `lt` (Lithuanian), `mk` (Macedonian), `ms` (Malay), `ml` (Malayalam), `mt` (Maltese), `mr` (Marathi), `mn` (Mongolian), `ne` (Nepali), `no` (Norwegian), `fa` (Persian), `pa` (Punjabi), `ro` (Romanian), `sa` (Sanskrit), `sr` (Serbian), `si` (Sinhala), `sk` (Slovak), `sl` (Slovenian), `so` (Somali), `sw` (Swahili), `sv` (Swedish), `tl` (Tagalog), `ta` (Tamil), `te` (Telugu), `th` (Thai), `uk` (Ukrainian), `ur` (Urdu), `vi` (Vietnamese), `cy` (Welsh), `yo` (Yoruba)




### Translation Configuration

```javascript
const client = new MaestraClient({
  apiKey: 'YOUR_API_KEY',
  sourceLanguage: 'en',         // What language is being spoken
  targetLanguage: 'fr',         // Translate to French (automatically enables translation)
  saveToDashboard: true        // Save session to dashboard
});

// ⚠️ IMPORTANT: When targetLanguage is specified, handle BOTH transcription AND translation events
// Listen for translation events with proper null checks
client.on('interim-translation', (segments) => {
  if (segments && Array.isArray(segments) && segments.length > 0) {
    const text = segments.map(s => s.text).join(' ');
    console.log(`🌐 Translating: ${text}`);
  }
});

client.on('finalized-translation', (segment) => {
  if (segment && segment.text) {
    console.log(`✅ Translated: ${segment.text} [${segment.start}s -> ${segment.end}s]`);
  }
});
```

### Best Practices

#### Always Use Null Checks for Event Handlers

To prevent `Cannot read properties of undefined (reading 'map')` errors, always validate data before processing:

```javascript
// ✅ GOOD - With null checks
client.on('interim-transcription', (segments) => {
  if (segments && Array.isArray(segments) && segments.length > 0) {
    const text = segments.map(s => s.text).join(' ');
    console.log(text);
  }
});

// ❌ BAD - No null checks (can crash)
client.on('interim-transcription', (segments) => {
  const text = segments.map(s => s.text).join(' '); // Error if segments is undefined!
  console.log(text);
});
```

#### Complete Event Handler Setup for Translation

When using `targetLanguage`, set up all four event handlers:

```javascript
const client = new MaestraClient({
  targetLanguage: 'fr'  // Translation automatically enabled when targetLanguage is specified
});

// Handle transcription events
client.on('interim-transcription', (segments) => { /* ... */ });
client.on('finalized-transcription', (segment) => { /* ... */ });

// Handle translation events (required when targetLanguage is specified)
client.on('interim-translation', (segments) => { /* ... */ });
client.on('finalized-translation', (segment) => { /* ... */ });
```

### Backward Compatibility

The SDK maintains backward compatibility with the legacy `language` parameter:

```javascript
// ✅ New way (recommended)
const client = new MaestraClient({
  sourceLanguage: 'en',
  targetLanguage: 'fr'
});

// ✅ Legacy way (still works)
const client = new MaestraClient({
  language: 'en',           // Will be treated as sourceLanguage
  targetLanguage: 'fr'
});
```

## API Overview

### `MaestraClient`

The main client for interacting with the Maestra API.

**Constructor Options:**

*   `apiKey` (string): Maestra API key (required)
*   `host` (string): Server hostname (default: 'wlive2.maestra.ai')
*   `port` (number): Server port (default: 443)
*   `secure` (boolean): Use WSS connection (default: true)
*   `sourceLanguage` (string): Source language code or 'auto' for detection
*   `targetLanguage` (string): Target language for translation (automatically enables translation when specified)
*   `saveToDashboard` (boolean): Save transcription to dashboard after session
*   `useVad` (boolean): Use voice activity detection (default: true)

**Events:**

*   `ready`: Fired when the client is connected and ready to transcribe.
*   `interim-transcription`: Provides in-progress transcription results.
*   `finalized-transcription`: Provides finalized transcription segments.
*   `interim-translation`: Provides in-progress translation results.
*   `finalized-translation`: Provides finalized translation segments.
*   `language-detected`: Fired when source language is auto-detected.
*   `error`: Fired when an error occurs.
*   `disconnect`: Fired when the client disconnects from the server.

### Audio Processors

This SDK includes several processors for handling different audio sources:

*   `MicrophoneProcessor`: For real-time audio from a microphone.
*   `FileProcessor`: For transcribing local audio/video files.
*   `HlsProcessor`: For HLS (HTTP Live Streaming) sources.
*   `RtmpsProcessor`: For RTMP/RTMPS (Real-Time Messaging Protocol) sources.
*   `RtspProcessor`: For RTSP (Real-Time Streaming Protocol) sources.
*   `SrtProcessor`: For SRT (Secure Reliable Transport) sources.
*   `VmixProcessor`: For sending live captions to vMix.

## CLI Examples

Command-line examples are available from Maestra for quick testing and integration:

> **Note**: CLI examples are not included in the npm package but are available as separate downloads from Maestra.

```bash
# Download CLI examples from Maestra
# Extract to your preferred location
cd maestra-client-sdk/examples

# Install dependencies
npm install

# Run CLI examples (transcription only)
node run_maestra_client.js --apiKey YOUR_API_KEY

# File transcription  
node run_maestra_client.js --apiKey YOUR_API_KEY --file path/to/audio.wav

# Stream transcription
node run_maestra_client.js --apiKey YOUR_API_KEY --hls_url http://example.com/stream.m3u8

# With language configuration (transcription only)
node run_maestra_client.js --apiKey YOUR_API_KEY --sourceLanguage en

# Enable translation from English to French (translation automatically enabled)
node run_maestra_client.js --apiKey YOUR_API_KEY --sourceLanguage en --targetLanguage fr

# Auto-detect source language and translate to Spanish (translation automatically enabled)
node run_maestra_client.js --apiKey YOUR_API_KEY --sourceLanguage auto --targetLanguage es

# Transcribe French audio and save to dashboard (no translation)
node run_maestra_client.js --apiKey YOUR_API_KEY --sourceLanguage fr --saveToDashboard true

# Enable translation with all features (translation automatically enabled)
node run_maestra_client.js --apiKey YOUR_API_KEY --sourceLanguage auto --targetLanguage es --saveToDashboard
```

For complete CLI documentation and usage instructions, contact Maestra for the examples package.
