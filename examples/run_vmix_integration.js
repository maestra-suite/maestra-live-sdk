const {
  MaestraClient,
  MicrophoneProcessor,
  VmixProcessor,
} = require("../index");

// --- Main Logic ---
async function main() {
  const { default: yargs } = await import("yargs/yargs");
  const { hideBin } = await import("yargs/helpers");

  // --- Configuration ---
  const argv = yargs(hideBin(process.argv))
    .option("apiKey", {
      alias: "k",
      description: "Your Maestra API key.",
      type: "string",
      demandOption: true,
    })
    .option("vmixAddress", {
      alias: "v",
      description:
        "The URL for the vMix Web Controller API (e.g., 'http://127.0.0.1:8088').",
      type: "string",
      demandOption: true,
    })
    .option("sourceLanguage", {
      alias: "sl",
      description:
        "Source language for transcription (e.g., 'en', 'fr', 'es').",
      type: "string",
      default: "en",
    })
    .option("targetLanguage", {
      alias: "tl",
      description: "Target language for translation.",
      type: "string",
    })
    .option("useTranslation", {
      description: "Use translation instead of transcription.",
      type: "boolean",
      default: false,
    })
    .option("useInterim", {
      description: "Use interim transcripts for faster, 'flickering' captions.",
      type: "boolean",
      default: false,
    })
    .help()
    .alias("help", "h").argv;

  // 1. Initialize MaestraClient
  const maestraClient = new MaestraClient({
    apiKey: argv.apiKey,
    sourceLanguage: argv.sourceLanguage, // Specify source language
    ...(argv.targetLanguage && { targetLanguage: argv.targetLanguage }),
  });

  // 2. Initialize the desired Audio Processor (e.g., Microphone)
  const audioProcessor = new MicrophoneProcessor();

  // 3. Initialize the VmixProcessor
  const vmixProcessor = new VmixProcessor({
    vmixAddress: argv.vmixAddress,
    useInterim: argv.useInterim, // Set to true for faster, "flickering" captions
    useTranslation: argv.useTranslation,
  });

  try {
    // 4. Initialize the connection to vMix and auto-discover the input
    console.log("Initializing vMix connection...");
    await vmixProcessor.initialize();
  } catch (error) {
    console.error(`❌ Failed to initialize vMix Processor: ${error.message}`);
    return;
  }

  // --- Event Handling ---
  maestraClient.on("ready", () => {
    console.log("✅ MaestraClient is connected and ready.");

    // 5. Attach the VmixProcessor to the client
    vmixProcessor.attach(maestraClient);
    console.log("VmixProcessor attached. Starting transcription...");

    // 6. Start transcribing
    maestraClient.transcribe(audioProcessor);
  });

  maestraClient.on("transcription-started", () => {
    console.log("Transcription has started. Listening for audio...");
  });

  maestraClient.on("finalized-transcription", (segment) => {
    console.log("Finalized:", segment.text);
  });

  maestraClient.on("interim-transcription", (segment) => {
    // This will only be received if `useInterim` is false in VmixProcessor,
    // but we can still log it for debugging.
    if (segment.text) {
      console.log("Interim:", segment.text);
    }
  });

  maestraClient.on("finalized-translation", (segment) => {
    console.log("Translated:", segment.text);
  });

  maestraClient.on("interim-translation", (segment) => {
    if (segment.text) {
      console.log("Translating:", segment.text);
    }
  });

  vmixProcessor.on("error", (error) => {
    console.error("VmixProcessor Error:", error.message);
    console.log("Attempting to stop MaestraClient...");
    maestraClient.stop();
  });

  maestraClient.on("error", (error) => {
    console.error("MaestraClient Error:", error);
    vmixProcessor.detach();
  });

  maestraClient.on("disconnect", () => {
    console.log("MaestraClient disconnected.");
    vmixProcessor.detach();
  });

  // --- Start Connection ---
  console.log("Connecting to Maestra...");
  maestraClient.connect();

  // --- Graceful Shutdown ---
  process.on("SIGINT", () => {
    console.log("\nCaught interrupt signal. Shutting down...");
    maestraClient.stop();
    vmixProcessor.detach();
    process.exit(0);
  });
}

main().catch(console.error);
