#!/usr/bin/env node

/**
 * @fileoverview Maestra CLI - Command-line interface for the Maestra Client SDK
 * 
 * This CLI tool provides a comprehensive interface for real-time transcription and translation
 * using the Maestra Client SDK. It supports multiple audio sources including microphone,
 * local files, and various streaming protocols (HLS, RTMP/S, RTSP, SRT).
 * 
 * @example
 * // Microphone transcription
 * maestra-cli --apikey YOUR_API_KEY
 * 
 * @example
 * // File transcription
 * maestra-cli --apikey YOUR_API_KEY --file audio.wav
 * 
 * @example
 * // Stream transcription
 * maestra-cli --apikey YOUR_API_KEY --hls_url http://example.com/stream.m3u8
 * 
 * @author Maestra AI
 * @version 1.0.0
 */

const {
  MaestraClient,
  MicrophoneProcessor,
  HlsProcessor,
  FileProcessor,
  RtmpsProcessor,
  RtspProcessor,
  SrtProcessor
} = require('..');
const readline = require('readline');

/**
 * Main CLI application function
 * 
 * Handles command-line argument parsing, client configuration, and orchestrates
 * the transcription process based on the selected audio source.
 * 
 * @async
 * @function main
 * @returns {Promise<void>} Promise that resolves when the application completes
 * 
 * @example
 * // The main function is automatically called when the script runs
 * // It handles all CLI operations including:
 * // - Argument parsing with yargs
 * // - Client configuration and connection
 * // - Audio processor selection and initialization
 * // - Event handling for transcription results
 * // - Graceful shutdown on interruption
 */
async function main() {
  const { default: yargs } = await import('yargs');
  const { hideBin } = await import('yargs/helpers');

  // --- Argument Parsing ---
  const argv = yargs(hideBin(process.argv))
    .option('apikey', {
      alias: 'ak',
      type: 'string',
      description: 'API key for authentication',
      demandOption: true,
    })
    .option('hls_url', {
      type: 'string',
      description: 'An HLS stream URL to transcribe instead of the microphone.',
    })
    .option('file', {
      type: 'string',
      description: 'Path to a local audio/video file to transcribe.',
    })
    .option('rtmps_url', {
      type: 'string',
      description: 'An RTMPS stream URL to transcribe.',
    })
    .option('rtsp_url', {
      type: 'string',
      description: 'An RTSP stream URL to transcribe.',
    })
    .option('srt_url', {
      type: 'string',
      description: 'An SRT stream URL to transcribe.',
    })
    .option('host', {
      type: 'string',
      description: 'The server host to connect to.'
    })
    .option('port', {
      type: 'number',
      description: 'The server port to connect to.'
    })
    .option('secure', {
      type: 'boolean',
      description: 'Use a secure (WSS) connection. Defaults to false.'
    })
    .option('sourceLanguage', {
      alias: 'sl',
      type: 'string',
      description: 'Source language code (e.g., "en", "fr", "es"). Use "auto" for automatic detection.'
    })
    .option('targetLanguage', {
      alias: 'tl', 
      type: 'string',
      description: 'Target language code for translation (e.g., "en", "fr", "es").'
    })
    .option('saveToDashboard', {
      alias: 'sd',
      type: 'boolean',
      description: 'Save transcription to dashboard after session ends.'
    })
    .help()
    .alias('help', 'h')
    .argv;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // --- Maestra Client Setup ---
  console.log('Initializing Maestra Client...');

  const clientConfig = {
    apiKey: argv.apikey,
    host: argv.host || 'maestra-live.maestra.ai',
    port: argv.port || 443,
    secure: argv.secure !== undefined ? argv.secure : true,
  };
  
  // Debug: Show the configuration being used
  console.log('📋 Client Configuration:');
  console.log(`   🔑 API Key: ${argv.apikey ? `${argv.apikey.substring(0, 8)}...` : 'NOT PROVIDED'}`);
  console.log(`   🌐 Host: ${clientConfig.host}`);
  console.log(`   🔌 Port: ${clientConfig.port}`);
  console.log(`   🔒 Secure: ${clientConfig.secure}`);
  
  // Add language parameters if provided
  if (argv.sourceLanguage) {
    clientConfig.sourceLanguage = argv.sourceLanguage;
    console.log(`🗣️  Source language set to: ${argv.sourceLanguage}`);
  }
  if (argv.targetLanguage) {
    clientConfig.targetLanguage = argv.targetLanguage;
    console.log(`🌐 Target language set to: ${argv.targetLanguage}`);
  }
  if (argv.saveToDashboard !== undefined) {
    clientConfig.saveToDashboard = argv.saveToDashboard;
    console.log(`💾 Will ${argv.saveToDashboard ? 'save' : 'not save'} transcription to dashboard`);
  }
  if (argv.translationEnabled !== undefined) {
    clientConfig.translationEnabled = argv.translationEnabled;
    console.log(`🌐 Translation ${argv.translationEnabled ? 'enabled' : 'disabled'}`);
  }

  const maestraClient = new MaestraClient(clientConfig);

  // --- Event Listeners ---
  maestraClient.on('ready', () => {
    console.log('✅ Client is ready and connected to the server.');

    if (argv.file) {
      try {
        console.log(`\nAttempting to transcribe from file: ${argv.file}`);
        const processor = new FileProcessor(argv.file);
        maestraClient.transcribe(processor);
      } catch (error) {
        console.error('❌ Failed to start file transcription:', error.message || error);
      }
    } else if (argv.hls_url) {
      try {
        console.log(`\nAttempting to transcribe from HLS stream: ${argv.hls_url}`);
        const processor = new HlsProcessor(argv.hls_url);
        maestraClient.transcribe(processor);
      } catch (error) {
        console.error('❌ Failed to start HLS transcription:', error.message || error);
      }
    } else if (argv.rtmps_url) {
      try {
        console.log(`\nAttempting to transcribe from RTMPS stream: ${argv.rtmps_url}`);
        const processor = new RtmpsProcessor(argv.rtmps_url);
        maestraClient.transcribe(processor);
      } catch (error) {
        console.error('❌ Failed to start RTMPS transcription:', error.message || error);
      }
    } else if (argv.rtsp_url) {
      try {
        console.log(`\nAttempting to transcribe from RTSP stream: ${argv.rtsp_url}`);
        const processor = new RtspProcessor(argv.rtsp_url);
        maestraClient.transcribe(processor);
      } catch (error) {
        console.error('❌ Failed to start RTSP transcription:', error.message || error);
      }
    } else if (argv.srt_url) {
      try {
        console.log(`\nAttempting to transcribe from SRT stream: ${argv.srt_url}`);
        const processor = new SrtProcessor(argv.srt_url);
        maestraClient.transcribe(processor);
      } catch (error) {
        console.error('❌ Failed to start SRT transcription:', error.message || error);
      }
    } else {
      rl.question('Press Enter to start microphone transcription...', () => {
          try {
              console.log(`\nAttempting to transcribe from microphone...`);
              const processor = new MicrophoneProcessor({
                onError: (error) => {
                  console.error('\n❌ Microphone error:', error);
                  console.error('📋 Error details:', error.message);
                  
                  if (error.message.includes('sox') || error.message.includes('SoX')) {
                    console.error('\n🔧 SOLUTION: Install SoX (Sound eXchange) on your system:');
                    console.error('   • On Windows: Download from https://sourceforge.net/projects/sox/');
                    console.error('   • On macOS: brew install sox');
                    console.error('   • On Ubuntu/Debian: sudo apt-get install sox');
                    console.error('   • On CentOS/RHEL: sudo yum install sox');
                  }
                  
                  process.exit(1);
                }
              });
              maestraClient.transcribe(processor);
          } catch (error) {
              console.error('❌ Failed to start transcription:', error.message || error);
          }
      });
    }
  });

  maestraClient.on('language-detected', (language) => {
    console.log(`\n\n================================================`);
    console.log(`   LANGUAGE DETECTED: ${language.toUpperCase()}   `);
    console.log(`================================================\n`);
  });

  maestraClient.on('transcription-started', () => {
    console.log('🔴 Transcription started. Listening for audio...');
  });

  maestraClient.on('interim-transcription', (segments) => {
    const text = segments.map(s => s.text).join(' ');
    process.stdout.write(`\r👂 Original: ${text}`);
  });

  maestraClient.on('finalized-transcription', (segment) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    const message = `✅ Original: ${segment.text} [${segment.start}s -> ${segment.end}s]`;
    console.log(message);
  });

  maestraClient.on('interim-translation', (segments) => {
    const text = segments.map(s => s.text).join(' ');
    // Move to the next line to print translation below the original
    process.stdout.clearLine(1);
    process.stdout.cursorTo(0);
    process.stdout.write(`\r🌐 Translation: ${text}`);
  });

  maestraClient.on('finalized-translation', (segment) => {
    process.stdout.clearLine(1);
    process.stdout.cursorTo(0);
    const message = `\n🌐 Translated: ${segment.text} [${segment.start}s -> ${segment.end}s]`;
    console.log(message);
  });

  maestraClient.on('error', (error) => {
    console.error('\n❌ An error occurred:', error.message || error);
    console.error('📋 Error details:', error);
  });

  maestraClient.on('disconnect', () => {
    console.log('\n🔌 Client disconnected.');
    rl.close();
    process.exit(0);
  });

  maestraClient.on('transcription-stopped', () => {
    console.log('\n⏹️ Transcription stopped.');
  });
  
  // --- Start Connection ---
  try {
    console.log('🔄 Attempting to connect to the server...');
    console.log(`📍 Connecting to: ${clientConfig.secure ? 'wss' : 'ws'}://${clientConfig.host}:${clientConfig.port}`);
    maestraClient.connect();
  } catch (error) {
    console.error('❌ Failed to start connection:', error.message || error);
    console.error('📋 Connection error details:', error);
    process.exit(1);
  }

  // --- Graceful Shutdown ---
  process.on('SIGINT', () => {
    console.log('\nCaught interrupt signal. Stopping transcription...');
    maestraClient.stop();
    rl.close();
  });
}

/**
 * Initialize and run the CLI application
 * 
 * This immediately invokes the main function to start the CLI application.
 * The application will run until manually interrupted (Ctrl+C) or until
 * the transcription process completes naturally.
 */
main(); 