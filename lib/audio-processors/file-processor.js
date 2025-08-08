const FfmpegProcessor = require('./ffmpeg-processor');

class FileProcessor extends FfmpegProcessor {
  /**
   * Creates a file processor
   * @param {string} filePath - The path to the local audio/video file
   * @param {Object} options - Configuration options
   */
  constructor(filePath, options = {}) {
    super(filePath, options);
  }

  /**
   * Provides the specific FFmpeg input options for file processing.
   * @returns {string[]} An array of FFmpeg input option strings.
   * @protected
   */
  _getInputOptions() {
    // No special options needed for local files,
    // FFmpeg should process as fast as possible.
    return [];
  }
}

module.exports = FileProcessor; 