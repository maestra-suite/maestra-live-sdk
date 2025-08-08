const FfmpegProcessor = require('./ffmpeg-processor');

class RtspProcessor extends FfmpegProcessor {
  /**
   * Creates an RTSP stream processor
   * @param {string} rtspUrl - The RTSP stream URL
   * @param {Object} options - Configuration options
   */
  constructor(rtspUrl, options = {}) {
    super(rtspUrl, options);
  }

  /**
   * Provides the specific FFmpeg input options for RTSP.
   * @returns {string[]} An array of FFmpeg input option strings.
   * @protected
   */
  _getInputOptions() {
    const inputOptions = [
        '-thread_queue_size', '512', // Helps with stream stability
    ];
    
    // Use TCP for transport if the URL is a standard RTSP stream
    if (this.sourceUrl.startsWith('rtsp://')) {
      inputOptions.push('-rtsp_transport', 'tcp');
    }
    
    return inputOptions;
  }
}

module.exports = RtspProcessor; 