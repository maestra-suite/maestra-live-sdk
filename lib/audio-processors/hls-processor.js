const FfmpegProcessor = require('./ffmpeg-processor');

class HlsProcessor extends FfmpegProcessor {
  /**
   * Creates an HLS stream processor
   * @param {string} hlsUrl - The HLS stream URL
   * @param {Object} options - Configuration options
   */
  constructor(hlsUrl, options = {}) {
    super(hlsUrl, options);
  }

  /**
   * Provides optimized FFmpeg input options for HLS streams.
   * Optimized for faster audio processing without video overhead.
   * @returns {string[]} An array of FFmpeg input option strings.
   * @protected
   */
  _getInputOptions() {
    return [
      '-re',                        // Read at native frame rate
      '-fflags', 'nobuffer',        // Disable input buffering  
      '-flags', 'low_delay',        // Enable low delay mode
      '-probesize', '1500000',      // 1.5MB probe - faster detection
      '-analyzeduration', '400000', // 0.4s analysis - slightly faster startup
      '-timeout', '10000000',       // 10s timeout (microseconds)
      '-reconnect', '1',            // Auto-reconnect
      '-reconnect_streamed', '1',   // Reconnect for streams
      '-threads', '1'               // Single thread for audio processing
    ];
  }
}

module.exports = HlsProcessor; 