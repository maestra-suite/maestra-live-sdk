const FfmpegProcessor = require('./ffmpeg-processor');

class RtmpsProcessor extends FfmpegProcessor {
  /**
   * Creates an RTMPS stream processor
   * @param {string} rtmpsUrl - The RTMPS stream URL
   * @param {Object} options - Configuration options
   */
  constructor(rtmpsUrl, options = {}) {
    super(rtmpsUrl, options);
  }

  /**
   * Provides the specific FFmpeg input options for RTMPS.
   * @returns {string[]} An array of FFmpeg input option strings.
   * @protected
   */
  _getInputOptions() {
    // Read input at native frame rate.
    return ['-re'];
  }
}

module.exports = RtmpsProcessor; 