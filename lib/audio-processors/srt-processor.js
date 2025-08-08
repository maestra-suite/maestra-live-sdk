const FfmpegProcessor = require('./ffmpeg-processor');

class SrtProcessor extends FfmpegProcessor {
  /**
   * Creates an SRT stream processor
   * @param {string} srtUrl - The SRT stream URL
   * @param {Object} options - Configuration options
   */
  constructor(srtUrl, options = {}) {
    super(srtUrl, options);
  }

  /**
   * Provides the specific FFmpeg input options for SRT.
   * @returns {string[]} An array of FFmpeg input option strings.
   * @protected
   */
  _getInputOptions() {
    // No specific input options needed for SRT by default
    return [];
  }
}

module.exports = SrtProcessor; 