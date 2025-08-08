const EventEmitter = require("events");
const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");

const MAX_ERRORS_IN_PERIOD = 10;
const ERROR_PERIOD_SECONDS = 30;

class VmixProcessor extends EventEmitter {
  /**
   * Creates a VmixProcessor instance.
   * @param {Object} options - Configuration for the vMix processor.
   * @param {string} options.vmixAddress - The URL for the vMix Web Controller API (e.g., 'http://127.0.0.1:8088').
   * @param {string} [options.input] - Optional. The GUID of the Title input in vMix. If not provided, it will be auto-discovered.
   * @param {string} [options.elementName='WebCaptionerCaptions'] - The name of the text element in the vMix Title.
   * @param {boolean} [options.useTranslation=false] - If true, the processor will listen for translation events instead of transcription events.
   * @param {boolean} [options.useInterim=false] - Whether to use interim or finalized transcripts.
   * @param {number} [options.maxLineLength=40] - Maximum characters per line for captions.
   * @param {number} [options.updateInterval=100] - Interval in ms to send updates to vMix.
   */
  constructor(options = {}) {
    super();

    if (!options.vmixAddress) {
      throw new Error("vmixAddress is a required option.");
    }

    try {
      new URL(options.vmixAddress);
    } catch (e) {
      throw new Error("The vmixAddress is not a valid URL.");
    }

    this.options = {
      elementName: "WebCaptionerCaptions",
      useInterim: false,
      maxLineLength: 40,
      updateInterval: 100,
      ...options,
    };

    this.inputGuid = options.input || null;
    this.maestraClient = null;
    this.transcriptBuffer = [];
    this.currentTranscriptTimestamp = 0;
    this.transcriptCurrentlyDisplayed = [];
    this.intervalId = null;
    this.errorTimestamps = [];
    this.isInitialized = false;
    this.activeVmixAddress = this.options.vmixAddress;
  }

  /**
   * Initializes the VmixProcessor, auto-discovering the input GUID if necessary.
   * This must be called before attaching the processor.
   */
  async initialize() {
    if (this.inputGuid) {
      console.log(
        `Using provided vMix input GUID: ${this.inputGuid}. Skipping auto-discovery.`
      );
      this.isInitialized = true;
      return;
    }

    try {
      const vmixApiUrl = new URL(this.options.vmixAddress);
      vmixApiUrl.pathname = "/API";

      let response;
      try {
        response = await this._fetchWithTimeout(vmixApiUrl.toString());
        this.activeVmixAddress = vmixApiUrl.toString();
      } catch (e) {
        // Initial request failed, try localhost fallback
        console.log(
          "Could not connect to vMix at the specified address. Trying localhost fallback..."
        );
        const localhostUrl = new URL(vmixApiUrl);
        localhostUrl.hostname = "127.0.0.1";
        response = await this._fetchWithTimeout(localhostUrl.toString());
        this.activeVmixAddress = localhostUrl.toString();
        console.log("Successfully connected to vMix via localhost.");
      }

      const xmlData = await response.text();
      const parsedXml = await parseStringPromise(xmlData);

      if (
        !parsedXml.vmix ||
        !parsedXml.vmix.inputs ||
        !parsedXml.vmix.inputs[0].input
      ) {
        throw new Error("Invalid XML structure in vMix API response.");
      }

      const inputs = parsedXml.vmix.inputs[0].input;
      for (const input of inputs) {
        if (input.text) {
          const textField = input.text.find(
            (t) => t.$.name === this.options.elementName
          );
          if (textField) {
            this.inputGuid = input.$.key;
            break;
          }
        }
      }

      if (!this.inputGuid) {
        throw new Error(
          `Could not auto-discover the vMix input. Please ensure you have added the 'vmix_caption_template.xaml' title to vMix and that it is active.`
        );
      }

      console.log(
        `Successfully auto-discovered vMix input GUID: ${this.inputGuid}`
      );
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`vMix initialization failed: ${error.message}`);
    }
  }

  /**
   * Attaches the VmixProcessor to a MaestraClient instance.
   * @param {MaestraClient} maestraClient - The MaestraClient instance.
   */
  attach(maestraClient) {
    if (!this.isInitialized) {
      throw new Error(
        "VmixProcessor has not been initialized. Please call initialize() first."
      );
    }

    if (this.maestraClient) {
      this.detach(); // Detach from any existing client first
    }
    this.maestraClient = maestraClient;

    const eventType = this.options.useTranslation
      ? "translation"
      : "transcription";
    const mainEventName = `${
      this.options.useInterim ? "interim" : "finalized"
    }-${eventType}`;
    this.maestraClient.on(mainEventName, this._handleTranscription);

    if (this.options.useInterim) {
      const finalizedEventName = `finalized-${eventType}`;
      this.maestraClient.on(finalizedEventName, this._handleFinalizedTimestamp);
    }

    this.intervalId = setInterval(
      this._sendAndFormatCaptions.bind(this),
      this.options.updateInterval
    );
  }

  /**
   * Detaches the VmixProcessor from the MaestraClient.
   */
  detach() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.maestraClient) {
      const eventType = this.options.useTranslation
        ? "translation"
        : "transcription";
      const mainEventName = `${
        this.options.useInterim ? "interim" : "finalized"
      }-${eventType}`;
      this.maestraClient.removeListener(
        mainEventName,
        this._handleTranscription
      );

      if (this.options.useInterim) {
        const finalizedEventName = `finalized-${eventType}`;
        this.maestraClient.removeListener(
          finalizedEventName,
          this._handleFinalizedTimestamp
        );
      }
      this.maestraClient = null;
    }

    this.transcriptBuffer = [];
    this.transcriptCurrentlyDisplayed = [];
    this.errorTimestamps = [];
  }

  _handleFinalizedTimestamp = (segment) => {
    if (Number(segment.end) > this.currentTranscriptTimestamp) {
      this.currentTranscriptTimestamp = Number(segment.end);
    }
  };

  _handleTranscription = (segment) => {
    if (segment && segment.text) {
      if (Number(segment.end) > this.currentTranscriptTimestamp) {
        this.currentTranscriptTimestamp = Number(segment.end);
        this.transcriptBuffer.push(...segment.text.split(" "));
      }
    } else if (segment && segment.length) {
      segment.forEach((s) => {
        if (Number(s.start) > this.currentTranscriptTimestamp) {
          s.text.split(" ").forEach((word) => {
            this.transcriptBuffer.push(word);
          });
        }
      });
    }
  };

  async _sendAndFormatCaptions() {
    if (this.transcriptBuffer.length > 0) {
      this.transcriptCurrentlyDisplayed.push(...this.transcriptBuffer);
      this.transcriptBuffer = [];
    }

    // Line wrapping logic
    const lastLineBreakIndex =
      this.transcriptCurrentlyDisplayed.lastIndexOf("\n");
    const firstWordAfterLastLineBreakIndex = lastLineBreakIndex + 1;

    for (
      let i = firstWordAfterLastLineBreakIndex;
      i < this.transcriptCurrentlyDisplayed.length;
      i++
    ) {
      const line = this.transcriptCurrentlyDisplayed
        .slice(firstWordAfterLastLineBreakIndex, i + 1)
        .join(" ");
      if (line.length > this.options.maxLineLength) {
        this.transcriptCurrentlyDisplayed.splice(i, 0, "\n");
        break;
      }
    }

    // Enforce two-line limit
    const lineBreakCount = this.transcriptCurrentlyDisplayed.filter(
      (word) => word === "\n"
    ).length;
    if (lineBreakCount >= 2) {
      const firstLineBreakIndex =
        this.transcriptCurrentlyDisplayed.indexOf("\n");
      this.transcriptCurrentlyDisplayed.splice(0, firstLineBreakIndex + 1);
    }

    const transcript = this.transcriptCurrentlyDisplayed
      .join(" ")
      .replace(/ \n /g, "\n")
      .trim();

    if (
      transcript.length === 0 &&
      this.transcriptCurrentlyDisplayed.length > 0
    ) {
      return;
    }

    // Use the activeVmixAddress determined during initialization
    const url = new URL(this.activeVmixAddress);
    url.searchParams.set("Function", "SetText");
    url.searchParams.set("Input", this.inputGuid); // Use the discovered or provided GUID
    url.searchParams.set("SelectedName", this.options.elementName);
    url.searchParams.set("Value", transcript);

    try {
      await this._sendToVmix(url);
    } catch (e) {
      console.error("vMix Error:", e.message);
      this.errorTimestamps.push(new Date());

      const errorPeriodStartDate = new Date(
        Date.now() - 1000 * ERROR_PERIOD_SECONDS
      );
      const recentErrors = this.errorTimestamps.filter(
        (date) => date > errorPeriodStartDate
      );

      if (recentErrors.length > MAX_ERRORS_IN_PERIOD) {
        this.emit(
          "error",
          new Error(
            `Connection to vMix lost. Disabling integration after ${MAX_ERRORS_IN_PERIOD} errors in ${ERROR_PERIOD_SECONDS} seconds.`
          )
        );
        this.detach();
      }
    }
  }

  _fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = fetch(url, {
      ...options,
      signal: controller.signal,
    });

    response.finally(() => {
      clearTimeout(id);
    });

    return response;
  }

  _sendToVmix(url) {
    return this._fetchWithTimeout(url.toString())
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `vMix API returned an error: ${res.status} ${res.statusText}`
          );
        }
        return res;
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          throw new Error("Request to vMix timed out after 5 seconds.");
        }
        throw err;
      });
  }
}

module.exports = VmixProcessor;
