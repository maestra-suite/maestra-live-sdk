const EventEmitter = require('events');
const WebSocketClient = require('./websocket-client');

class MaestraClient extends EventEmitter {
  /**
   * Creates a Maestra transcription client
   * @param {Object} options - Configuration options
   * @param {string} [options.host='wlive2.maestra.ai'] - Server host
   * @param {number} [options.port=443] - Server port  
   * @param {boolean} [options.secure=true] - Use secure connection
   * @param {string} [options.sourceLanguage] - Source language code (e.g., 'en', 'fr', 'auto')
   * @param {string} [options.language] - Legacy: Source language code (use sourceLanguage instead)
   * @param {string} [options.targetLanguage] - Target language for translation
   * @param {string} [options.apiKey] - API key for authentication
   * @param {boolean} [options.saveToDashboard] - Save transcription to dashboard after session
   * @param {boolean} [options.useVad=true] - Use voice activity detection
   * @param {number} [options.connectionTimeout=10000] - Timeout for server response in milliseconds
   */
  constructor(options = {}) {
    super();
    this.options = {
      host: options.host || 'wlive2.maestra.ai', 
      port: options.port || 443, 
      secure: options.secure !== undefined ? options.secure : true,
      // Support both sourceLanguage (new) and language (legacy) for backward compatibility
      sourceLanguage: options.sourceLanguage || options.language || null,
      targetLanguage: options.targetLanguage || null,
      useVad: options.useVad !== undefined ? options.useVad : true,
      apiKey: options.apiKey,
      saveToDashboard: options.saveToDashboard !== undefined ? options.saveToDashboard : false,
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
  }
  
  /**
   * Connects to the Maestra server.
   * This should be called before any transcription attempts.
   * @returns {MaestraClient} - Returns this instance for chaining.
   */
  connect() {
    if (!this.websocketClient) {
      this._initWebSocketClient();
    }
    this.websocketClient.connect().catch(err => this.emit('error', err));
    return this;
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
}

module.exports = MaestraClient; 