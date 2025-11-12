const EventEmitter = require('events');
const WebSocketClient = require('./websocket-client');
const { initializeFirebase, updateCaptionerSettings, getUidFromApiKey } = require('./firebase-config');

class MaestraClient extends EventEmitter {
  /**
   * Creates a Maestra transcription client
   * @param {Object} options - Configuration options
   * @param {string} [options.host='live-node-dot-maestro-218920.uk.r.appspot.com'] - Server host
   * @param {number} [options.port] - Server port (optional, defaults to protocol standard)  
   * @param {boolean} [options.secure=true] - Use secure connection
   * @param {string} [options.sourceLanguage] - Source language code (e.g., 'en', 'fr', 'auto')
   * @param {string} [options.language] - Legacy: Source language code (use sourceLanguage instead)
   * @param {string} [options.targetLanguage] - Target language for translation
   * @param {string} [options.apiKey] - API key for authentication
   * @param {boolean} [options.saveToDashboard] - Save transcription to dashboard after session
   * @param {boolean} [options.useVad=true] - Use voice activity detection
   * @param {string} [options.voiceId] - Voice ID for voice-over generation
   * @param {boolean} [options.autoVoiceCloning=false] - Enable automatic voice cloning
   * @param {number} [options.connectionTimeout=10000] - Timeout for server response in milliseconds
   */
  constructor(options = {}) {
    super();
    this.options = {
      host: options.host || 'live-node-dot-maestro-218920.uk.r.appspot.com', 
      port: options.port, 
      secure: options.secure !== undefined ? options.secure : true,
      // Support both sourceLanguage (new) and language (legacy) for backward compatibility
      sourceLanguage: options.sourceLanguage || options.language || null,
      targetLanguage: options.targetLanguage || null,
      useVad: options.useVad !== undefined ? options.useVad : true,
      apiKey: options.apiKey,
      saveToDashboard: options.saveToDashboard !== undefined ? options.saveToDashboard : false,
      voiceId: options.voiceId || null,
      autoVoiceCloning: options.autoVoiceCloning !== undefined ? options.autoVoiceCloning : false,
      ...options
    };
    
    this.websocketClient = null;
    this.streamProcessor = null;
    this.isTranscribing = false;
    
    // Store transcription data
    this.transcriptionData = {
      segments: [],
      translatedSegments: [],
      finalizedSegments: [],
      finalizedTranslatedSegments: []
    };
  }
  
  /**
   * Initialize the WebSocket client and set up event forwarding
   * @private
   */
  _initWebSocketClient() {
    if (this.websocketClient) {
      return;
    }
    
    this.websocketClient = new WebSocketClient(
      this.options.host, 
      this.options.port, 
      {
        secure: this.options.secure,
        sourceLanguage: this.options.sourceLanguage,
        apiKey: this.options.apiKey,
        saveToDashboard: this.options.saveToDashboard,
        targetLanguage: this.options.targetLanguage,
        voiceId: this.options.voiceId,
        autoVoiceCloning: this.options.autoVoiceCloning,
        connectionTimeout: this.options.connectionTimeout
      }
    );
    
    // Forward events from WebSocketClient to MaestraClient
    this.websocketClient.on('ready', () => this.emit('ready'));
    this.websocketClient.on('error', (error) => this.emit('error', error));
    this.websocketClient.on('disconnect', () => this.emit('disconnect'));
    this.websocketClient.on('languageDetected', (language) => this.emit('language-detected', language));
    this.websocketClient.on('segments', (segments) => this.emit('interim-transcription', segments));
    this.websocketClient.on('translatedSegments', (segments) => this.emit('interim-translation', segments));
    this.websocketClient.on('finalizedSegment', (segment) => this.emit('finalized-transcription', segment));
    this.websocketClient.on('finalizedTranslatedSegment', (segment) => this.emit('finalized-translation', segment));
    this.websocketClient.on('finalizedSegmentAudioURL', (audioURL) => {
      this.emit('finalized-segment-audio-url', audioURL);
      
      // Auto-play audio if voiceOverEnabled is true
      if (this.options.voiceId && audioURL) {
        this._playAudioUrl(audioURL);
      }
    });
  }
  
  /**
   * Connects to the Maestra server.
   * This should be called before any transcription attempts.
   * @returns {Promise<MaestraClient>} - Returns this instance for chaining.
   */
  async connect() {
    try {
      // Initialize Firebase and update settings before connecting
      await this._updateFirebaseSettings();
      
      if (!this.websocketClient) {
        this._initWebSocketClient();
      }
      await this.websocketClient.connect();
      return this;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Updates Firebase database settings before connecting
   * @private
   */
  async _updateFirebaseSettings() {
    if (!this.options.apiKey) {
      console.warn('[MaestraClient] No API key provided, skipping Firebase settings update');
      return;
    }

    try {
      // Initialize Firebase
      initializeFirebase();
      
      // Get UID from API key
      const uid = await getUidFromApiKey(this.options.apiKey);
      if (!uid) {
        console.warn('[MaestraClient] Could not find UID for API key, skipping Firebase settings update');
        return;
      }

      // Prepare settings update
      const settings = {};
      
      if (this.options.sourceLanguage) {
        settings.sourceLanguage = this.options.sourceLanguage;
      }
      
      if (this.options.targetLanguage) {
        settings.targetLanguage = this.options.targetLanguage;
        settings.translationEnabled = true;
      } else {
        settings.translationEnabled = false;
      }
      
      if (this.options.autoVoiceCloning !== undefined) {
        settings.autoVoiceCloning = this.options.autoVoiceCloning;
      }
      
      if (this.options.voiceId) {
        settings.voiceId = this.options.voiceId;
      }

      // Update Firebase settings
      await updateCaptionerSettings(uid, settings);
      console.log('[MaestraClient] Firebase settings updated successfully:', JSON.stringify(settings, null, 2));
      
    } catch (error) {
      console.error('[MaestraClient] Failed to update Firebase settings:', error);
      // Don't throw error here - continue with connection attempt
    }
  }
  
  /**
   * Begins a transcription stream using a provided audio processor.
   * @param {Object} streamProcessor - An instance of an audio processor (e.g., MicrophoneProcessor).
   * @returns {MaestraClient} - Returns this instance for chaining.
   */
  transcribe(streamProcessor) {
    if (this.isTranscribing) {
      this.emit('error', new Error('Already transcribing. Stop current transcription first.'));
      return this;
    }
    if (!this.websocketClient || !this.websocketClient.isServerReady) {
      this.emit('error', new Error('Not connected or server not ready. Call connect() and wait for the "ready" event first.'));
      return this;
    }

    // Wire up the processor to send audio to the websocket
    streamProcessor.onAudioCallback = (audioData) => {
      if (this.websocketClient) {
        this.websocketClient.sendAudio(audioData);
      }
    };
    
    streamProcessor.onErrorCallback = (error) => {
      this.emit('error', error);
    };

    this.streamProcessor = streamProcessor;
    this.streamProcessor.start().catch(err => this.emit('error', err));
    
    this.isTranscribing = true;
    this.emit('transcription-started');
    
    return this;
  }
  
  /**
   * Stops the current transcription.
   * @returns {MaestraClient} - Returns this instance for chaining.
   */
  stop() {
    if (this.streamProcessor) {
      this.streamProcessor.stop();
      this.streamProcessor = null;
    }
    
    if (this.websocketClient) {
      this.websocketClient.close();
      this.websocketClient = null;
    }
    
    this.isTranscribing = false;
    this.emit('transcription-stopped');
    
    return this;
  }
  
  /**
   * Get the current transcription data
   * @returns {Object} - The current transcription data
   */
  getTranscriptionData() {
    return {
      interimTranscription: this.transcriptionData.segments,
      interimTranslation: this.transcriptionData.translatedSegments,
      finalizedTranscription: this.transcriptionData.finalizedSegments,
      finalizedTranslation: this.transcriptionData.finalizedTranslatedSegments
    };
  }
  
  /**
   * Play audio from URL (internal method)
   * @private
   * @param {string} audioUrl - The URL of the audio to play
   */
  _playAudioUrl(audioUrl) {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audio = new Audio(audioUrl);
        audio.crossOrigin = 'anonymous';
        
        audio.addEventListener('play', () => {
          this.emit('voiceover-play', { audioUrl });
        });
        
        audio.addEventListener('ended', () => {
          this.emit('voiceover-ended', { audioUrl });
        });
        
        audio.addEventListener('error', (event) => {
          const error = new Error(`Audio playback failed: ${event.error?.message || 'Unknown error'}`);
          this.emit('voiceover-error', { error, audioUrl });
        });
        
        // Attempt to play
        audio.play().catch(error => {
          if (error.name === 'NotAllowedError') {
            // Autoplay was blocked
            this.emit('voiceover-autoplay-blocked', { audioUrl });
          } else {
            this.emit('voiceover-error', { error, audioUrl });
          }
        });
        
      } else {
        // Node.js environment - emit URL for external handling
        this.emit('voiceover-url', { audioUrl });
      }
    } catch (error) {
      this.emit('voiceover-error', { error, audioUrl });
    }
  }

  
}

module.exports = MaestraClient; 