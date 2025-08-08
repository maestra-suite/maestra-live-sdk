const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');

// Set the path to the bundled FFmpeg binary once
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Base class for audio processors that use FFmpeg.
 * This class handles the common logic for starting, stopping,
 * and processing audio from an FFmpeg process.
 */
class FfmpegProcessor {
  /**
   * @param {string} sourceUrl - The input source URL or path for FFmpeg.
   * @param {Object} options - Configuration options.
   * @param {Function} [options.onAudio] - Callback for when audio data is received.
   * @param {Function} [options.onError] - Callback for when an error occurs.
   */
  constructor(sourceUrl, options = {}) {
    if (this.constructor === FfmpegProcessor) {
      throw new Error("FfmpegProcessor is an abstract class and cannot be instantiated directly.");
    }
    this.sourceUrl = sourceUrl;
    this.options = options;
    this.ffmpegProcess = null;
    this.isProcessing = false;
    this.onAudioCallback = options.onAudio || (() => {});
    this.onErrorCallback = options.onError || (() => {});
  }

  /**
   * Provides the specific FFmpeg input options for the subclass.
   * This method must be implemented by subclasses.
   * @returns {string[]} An array of FFmpeg input option strings.
   * @protected
   */
  _getInputOptions() {
    // Default implementation returns an empty array.
    // Subclasses should override this to provide specific options.
    return [];
  }

  /**
   * Starts processing the stream.
   * @returns {Promise<void>} A promise that resolves when the FFmpeg process has started.
   */
  start() {
    return new Promise((resolve, reject) => {
      if (this.isProcessing) {
        return resolve();
      }
      this.isProcessing = true;

      try {
        const audioStream = new PassThrough();
        const inputOptions = this._getInputOptions();


        
        this.ffmpegProcess = ffmpeg(this.sourceUrl)
          .inputOptions(inputOptions)
          .noVideo()
          .audioChannels(1)
          .audioFrequency(16000)
          .format('f32le') // 32-bit float PCM for whisper
          .on('start', (commandLine) => {
    
            resolve();
          })
          .on('error', (err) => {
            this.isProcessing = false;
            this.onErrorCallback(err);
            reject(err);
          })
          .on('end', () => {
            this.isProcessing = false;
          });

        this.ffmpegProcess.pipe(audioStream, { end: true });

        audioStream.on('data', (chunk) => {
          const audioData = new Float32Array(new Uint8Array(chunk).buffer);
          this.onAudioCallback(audioData);
        });

      } catch (error) {
        this.isProcessing = false;
        this.onErrorCallback(error);
        reject(error);
      }
    });
  }

  /**
   * Stops the FFmpeg process.
   */
  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }
    this.isProcessing = false;
  }
}

module.exports = FfmpegProcessor; 