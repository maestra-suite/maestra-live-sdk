/**
 * @fileoverview WebSocket client for Maestra transcription services
 * 
 * This module provides a WebSocket client that handles real-time communication
 * with Maestra's transcription servers. It manages connection lifecycle,
 * message handling, and event emission for transcription results.
 * 
 * @author Maestra AI
 * @version 1.0.0
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

/**
 * WebSocket client for real-time transcription communication
 * @extends EventEmitter
 */
class WebSocketClient extends EventEmitter {
  /**
   * Creates a WebSocket client for communicating with the Maestra transcription service
   * @param {string} host - The host to connect to
   * @param {number} port - The port to connect to
   * @param {Object} options - Configuration options
   * @param {boolean} [options.secure=true] - Use secure WebSocket connection
   * @param {string} [options.sourceLanguage] - Source language code
   * @param {string} [options.language] - Legacy: Source language code (use sourceLanguage instead)
   * @param {string} [options.targetLanguage] - Target language for translation
   * @param {string} [options.apiKey] - API key for authentication
   * @param {boolean} [options.saveToDashboard] - Save transcription after session
   * @param {boolean} [options.useVad=true] - Use voice activity detection
   * @param {string} [options.voiceId] - Voice ID for voice-over generation
   * @param {string} [options.uuid] - Custom UUID for the client
   * @param {number} [options.connectionTimeout=10000] - Timeout for server response in milliseconds
   */
  constructor(host, port, options = {}) {
    super();
    this.host = host;
    this.port = port;
    this.secure = options.secure !== undefined ? options.secure : true;
    // Support both sourceLanguage (new) and language (legacy) for backward compatibility
    this.sourceLanguage = options.sourceLanguage || options.language;
    this.uuid = options.uuid || this._generateUUID();
    this.apiKey = options.apiKey;
    this.saveToDashboard = options.saveToDashboard;
    this.targetLanguage = options.targetLanguage;
    this.voiceId = options.voiceId;
    this.useVad = options.useVad !== undefined ? options.useVad : true;
    this.socket = null;
    this.isServerReady = false;
    this.connectionTimeout = options.connectionTimeout || 10000; // 10 seconds default
    this.connectionTimer = null;
    
    // Callbacks for compatibility with existing code
    this.callbacks = {
      onTranscription: options.onTranscription || (() => {}),
      onLanguageDetected: options.onLanguageDetected || (() => {}),
      onError: options.onError || (() => {}),
      onClose: options.onClose || (() => {}),
      onReady: options.onReady || (() => {})
    };
  }

  get translationEnabled(){
    return this.targetLanguage !== null && this.targetLanguage !== undefined;
  }

  get voiceOverEnabled(){
    return this.voiceId !== null && this.voiceId !== undefined;
  }

  /**
   * Handles incoming WebSocket messages
   * @param {MessageEvent} event - The message event
   * @private
   */
  _handleMessage(event) {
    // Handle binary audio data (for potential audio responses)
    if (event.data instanceof ArrayBuffer) {
      // Handle binary data if needed
      this.emit('binaryData', event.data);
      return;
    }

    // Handle JSON messages
    try {
      const data = JSON.parse(event.data);

      
      // Ignore messages not meant for this client
      if (data.uid && data.uid !== this.uuid) {
        return;
      }

      // Handle server status messages
      if (data.status === "WAIT") {
        const error = new Error(data.message);
        this.callbacks.onError(error);
        this.emit('error', error);
        return;
      }

      // Handle authentication errors
      if (data.status === "ERROR" || data.error) {
        const errorMessage = data.message || data.error || 'Unknown error';
        let error;
        
        // Clear connection timeout since we got a response (even if it's an error)
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }
        
        // Check for authentication-related errors
        if (this._isAuthenticationError(errorMessage, data)) {
          error = new Error(`Connection failed: Authentication error. Please check your API key and ensure it is valid and has the necessary permissions.`);
        } else {
          error = new Error(`Connection failed: ${errorMessage}`);
        }
        
        this.callbacks.onError(error);
        this.emit('error', error);
        return;
      }

      // Handle server ready message
      if (!this.isServerReady) {
        this.isServerReady = true;
        
        // Clear connection timeout since we're now ready
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }
        
        this.callbacks.onReady();
        this.emit('ready');
        return;
      }

      // Handle language detection
      if (this.sourceLanguage === null && data.language) {
        this.sourceLanguage = data.language;
        this.callbacks.onLanguageDetected(data.language);
        this.emit('languageDetected', data.language);
        return;
      }

      // Handle disconnect message
      if (data.message === "DISCONNECT") {
        this.callbacks.onClose();
        this.emit('disconnect');
        this.close();
        return;
      }

      // Handle regular transcription segments
      if (data.segments) {
        // Filter current interim segments (don't accumulate old ones)
        const currentInterim = data.segments.filter(segment => segment.completed === false);
        if (currentInterim.length > 0) {
          this.emit('segments', currentInterim);
        }
      }
      
      // Handle translated segments
      if (data.translated_segments) {
        this.emit('translatedSegments', data.translated_segments);
      }
      
      // Handle finalized segment (single segment)
      if (data.segment) {
        this.emit('finalizedSegment', data.segment);
      }
      
      // Handle finalized translated segment
      if (data.translated_segment) {
        this.emit('finalizedTranslatedSegment', data.translated_segment);
      }

      if (data.type === "audio") {
        this.emit('finalizedSegmentAudioURL', data.audio_url);
      }

      // Call the legacy callback with the full data
      this.callbacks.onTranscription(data);
      
      // Also emit the full data for completeness
      this.emit('transcription', data);
      
    } catch (error) {
      this.callbacks.onError(error);
      this.emit('error', error);
    }
  }

  /**
   * Validates the API key format
   * @private
   * @returns {boolean} True if API key is valid format
   */
  _validateApiKey() {
    if (!this.apiKey) {
      return false;
    }
    
    // Basic validation - API key should be a non-empty string
    if (typeof this.apiKey !== 'string' || this.apiKey.trim().length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Checks if an error message indicates an authentication failure
   * @private
   * @param {string} errorMessage - The error message from the server
   * @param {Object} data - The full data object from the server
   * @returns {boolean} True if this appears to be an authentication error
   */
  _isAuthenticationError(errorMessage, data) {
    if (!errorMessage) return false;
    
    const message = errorMessage.toLowerCase();
    const authKeywords = [
      'unauthorized', 'authentication', 'invalid api key', 'api key',
      'forbidden', 'access denied', 'invalid token', 'invalid key',
      'authentication failed', 'invalid credentials', 'token expired',
      'key not found', 'permission denied'
    ];
    
    // Check if the error message contains authentication-related keywords
    const isAuthError = authKeywords.some(keyword => message.includes(keyword));
    
    // Also check for HTTP status codes that indicate authentication issues
    if (data.status_code === 401 || data.status_code === 403) {
      return true;
    }
    
    return isAuthError;
  }

  /**
   * Connects to the WebSocket server
   * @returns {Promise} A promise that resolves when the connection is established
   */
  connect() {
    return new Promise((resolve, reject) => {
      // Validate API key before attempting connection
      if (!this._validateApiKey()) {
        const error = new Error('Connection failed: Invalid or missing API key. Please provide a valid API key to authenticate.');
        this.callbacks.onError(error);
        this.emit('error', error);
        reject(error);
        return;
      }

      try {
        const protocol = this.secure ? 'wss' : 'ws';
        this.socket = new WebSocket(`${protocol}://${this.host}:${this.port}`);

        this.socket.onopen = () => {
          const options = {
            uid: this.uuid,
            authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined,
            use_vad: this.useVad
          };
          
          // Only include language parameters if they are explicitly set
          if (this.sourceLanguage !== null && this.sourceLanguage !== undefined) {
            options.sourceLanguage = this.sourceLanguage;
          }
          if (this.targetLanguage !== null && this.targetLanguage !== undefined) {
            options.targetLanguage = this.targetLanguage;
          }
          if (this.saveToDashboard !== null && this.saveToDashboard !== undefined) {
            options.saveToDashboard = this.saveToDashboard;
          }
          if (this.translationEnabled !== null && this.translationEnabled !== undefined) {
            options.translationEnabled = this.translationEnabled;
          }
          if (this.voiceOverEnabled !== null && this.voiceOverEnabled !== undefined) {
            options.voiceOverEnabled = this.voiceOverEnabled;
          }
          if (this.voiceId !== null && this.voiceId !== undefined) {
            options.voiceId = this.voiceId;
          }
          
          this.socket.send(JSON.stringify(options));
          
          // Set timeout for server ready confirmation
          this.connectionTimer = setTimeout(() => {
            if (!this.isServerReady) {
              const error = new Error('Connection failed: Timeout waiting for server response. This may indicate an invalid API key or server connectivity issues.');
              this.callbacks.onError(error);
              this.emit('error', error);
              this.close();
              reject(error);
            }
          }, this.connectionTimeout);
          
          resolve();
        };

        this.socket.onclose = (event) => {
          this.callbacks.onClose(event);
        };

        this.socket.onerror = (error) => {
          this.callbacks.onError(error);
          reject(error);
        };

        this.socket.onmessage = this._handleMessage.bind(this);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Sends audio data to the server
   * @param {Float32Array} audioData - The audio data to send
   */
  sendAudio(audioData) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.isServerReady) {
      this.socket.send(audioData);
    }
  }

  /**
   * Closes the WebSocket connection
   */
  close() {
    // Clear connection timeout if it exists
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
    }
    
    this.isServerReady = false;
  }

  _generateUUID() {
    return uuidv4();
  }
}

module.exports = WebSocketClient; 