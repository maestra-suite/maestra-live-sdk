const mic = require('node-microphone');
const { Transform } = require('stream');
const LibSampleRate = require('@alexanderolsen/libsamplerate-js');

class MicrophoneProcessor {
  /**
   * Creates a microphone audio processor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.microphone = null;
    this.micStream = null;
    this.isProcessing = false;
    this.onAudioCallback = options.onAudio || (() => {});
    this.onErrorCallback = options.onError || (() => {});
    
    // Default microphone settings
    this.sampleRate = options.sampleRate || 44100;
    this.channels = options.channels || 1;
    this.bitDepth = options.bitDepth || 16;
    this.resampler = null;
  }

  /**
   * Starts capturing audio from the microphone
   */
  async start() {
    if (this.isProcessing) {
      return;
    }

    // Create the resampler instance asynchronously
    this.resampler = await LibSampleRate.create(1, this.sampleRate, 16000, {
      converterType: LibSampleRate.ConverterType.SRC_SINC_FASTEST
    });

    this.isProcessing = true;
    
    try {
      // Create a new microphone instance, telling SoX to resample for us.
      this.microphone = new mic({
        rate: this.sampleRate.toString(),
        channels: this.channels.toString(),
        bitwidth: this.bitDepth.toString(),
        ...this.options.microphoneOptions
      });

      // Start recording
      this.micStream = this.microphone.startRecording();
      
      // Create a transform stream to process the audio chunks
      const processorStream = new Transform({
        transform: (chunk, encoding, callback) => {
          try {
            // Convert the chunk to a Float32Array for processing
            const buffer = Buffer.from(chunk);
            const pcmData = new Float32Array(buffer.length / 2);
            for (let i = 0; i < pcmData.length; i++) {
              const int16 = buffer.readInt16LE(i * 2);
              pcmData[i] = int16 / 32768.0; // Normalize to -1.0 to 1.0
            }

            // Resample the audio to 16kHz using the high-performance library
            const resampledAudio = this.resampler.simple(pcmData);
            this.onAudioCallback(resampledAudio);
            
            callback(null);
          } catch (error) {
            this.onErrorCallback(error);
            callback(error);
          }
        }
      });

      // Handle errors
      this.micStream.on('error', (err) => {
        this.isProcessing = false;
        this.onErrorCallback(err);
      });

      // Pipe the microphone stream to the processor
      this.micStream.pipe(processorStream);

    } catch (error) {
      this.isProcessing = false;
      this.onErrorCallback(error);
    }
  }

  /**
   * Stops capturing audio from the microphone
   */
  stop() {
    if (this.microphone) {
      this.microphone.stopRecording();
      this.microphone = null;
      this.micStream = null;
    }
    if (this.resampler) {
      this.resampler.destroy();
      this.resampler = null;
    }
    this.isProcessing = false;
  }
}

module.exports = MicrophoneProcessor; 