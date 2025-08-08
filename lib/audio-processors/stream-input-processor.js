const { PassThrough } = require('stream');

/**
 * A processor that receives audio from an external source,
 * such as a WebSocket, instead of managing its own FFmpeg process.
 */
class StreamInputProcessor {
  /**
   * @param {Object} options - Configuration options.
   * @param {Function} [options.onAudio] - Callback for when audio data is received.
   * @param {Function} [options.onError] - Callback for when an error occurs.
   */
  constructor(options = {}) {
    this.options = options;
    this.isProcessing = false;
    this.onAudioCallback = options.onAudio || (() => {});
    this.onErrorCallback = options.onError || (() => {});
    this.audioStream = null;
  }

  /**
   * Starts the processor by setting up the audio stream.
   * @returns {Promise<void>}
   */
  start() {
    return new Promise((resolve) => {
      if (this.isProcessing) {
        return resolve();
      }
      this.isProcessing = true;
      this.audioStream = new PassThrough();

      this.audioStream.on('data', (chunk) => {
        // The incoming chunk is a Buffer containing f32le audio
        this.onAudioCallback(chunk);
      });
      
      this.audioStream.on('error', (err) => {
        this.onErrorCallback(err);
      });

      resolve();
    });
  }

  /**
   * Pushes an audio chunk into the processor's stream.
   * @param {Buffer} audioChunk - The raw audio data as a Buffer.
   */
  pushAudio(audioChunk) {
    if (this.isProcessing && this.audioStream) {
  
      this.audioStream.push(audioChunk);
    }
  }

  /**
   * Stops the processor.
   */
  stop() {
    if (this.audioStream) {
      this.audioStream.end();
      this.audioStream = null;
    }
    this.isProcessing = false;
  }
}

module.exports = StreamInputProcessor; 