/**
 * @fileoverview Maestra Web Client
 * 
 * This client-side JavaScript provides the web interface for Maestra.
 * It handles WebSocket communication with the server, manages audio capture
 * from the microphone, and displays real-time transcription and translation results.
 * 
 * Features:
 * - Multiple audio source support (microphone, HLS, RTMP/S, RTSP, SRT)
 * - Real-time audio processing with Web Audio API
 * - WebSocket communication for transcription results
 * - Dynamic language detection and display
 * - Optional real-time translation
 * - Modern dark theme UI with split-screen layout
 * 
 * @author Maestra AI
 * @version 2.0.0
 */

/**
 * Main application initialization
 * Sets up event listeners, WebSocket communication, and audio processing
 */
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const restartButton = document.getElementById('restartButton');
    const newSessionButton = document.getElementById('newSessionButton');
    const statusDiv = document.getElementById('status');
    const transcriptDiv = document.getElementById('transcript');
    const translationDiv = document.getElementById('translation');
    const apiKeyInput = document.getElementById('authToken');
    const enableTranslationCheckbox = document.getElementById('enableTranslation');
    const enableVoiceOverCheckbox = document.getElementById('enableVoiceOver');
    const showInterimResultsCheckbox = document.getElementById('showInterimResults');
    const saveToDashboardCheckbox = document.getElementById('saveToDashboard');
    const sourceLanguageSelect = document.getElementById('sourceLanguage');
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const targetLanguageGroup = document.getElementById('targetLanguageGroup');
    const voiceOverGroup = document.getElementById('voiceOverGroup');
    
    // New UI Elements
    const setupPanel = document.getElementById('setupPanel');
    const transcriptionPanel = document.getElementById('transcriptionPanel');
    const promptMessage = document.getElementById('promptMessage');
    const transcriptContainer = document.querySelector('.transcript-container');
    const translationColumn = document.getElementById('translationColumn');
    const originalHeader = document.getElementById('originalHeader');
    const translationHeader = document.getElementById('translationHeader');
    const languageSelector = document.getElementById('languageSelector');
    const currentLanguages = document.getElementById('currentLanguages');

    // Tab elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Audio source inputs
    const hlsUrl = document.getElementById('hlsUrl');
    const rtmpsUrl = document.getElementById('rtmpsUrl');
    const rtspUrl = document.getElementById('rtspUrl');
    const srtUrl = document.getElementById('srtUrl');

    // State variables
    let ws;
    let audioContext;
    let scriptProcessor;
    let mediaStream;
    let detectedLanguage = null;
    let translationEnabled = false;
    let voiceOverEnabled = false;
    let showInterimResults = true;
    let saveToDashboard = false;
    let currentActiveTab = 'microphone';
    let isTranscribing = false;
    
    // --- UI Logic ---
    
    /**
     * Initialize tab switching functionality
     */
    function initializeTabs() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                switchTab(tabName);
            });
        });
    }

    /**
     * Switch between tabs
     * @param {string} tabName - The name of the tab to switch to
     */
    function switchTab(tabName) {
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update active tab panel
        tabPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        currentActiveTab = tabName;
    }

    /**
     * Handle translation checkbox change
     */
    enableTranslationCheckbox.addEventListener('change', () => {
        translationEnabled = enableTranslationCheckbox.checked;
        targetLanguageGroup.style.display = translationEnabled ? 'block' : 'none';
        voiceOverGroup.style.display = translationEnabled ? 'block' : 'none';
        
        // If translation is disabled, also disable voiceover
        if (!translationEnabled) {
            enableVoiceOverCheckbox.checked = false;
            voiceOverEnabled = false;
        }
        
        if (isTranscribing) {
            updateTranscriptionUI();
        }
    });

    /**
     * Handle voiceover checkbox change
     */
    enableVoiceOverCheckbox.addEventListener('change', () => {
        voiceOverEnabled = enableVoiceOverCheckbox.checked;
        
        // Voiceover requires translation
        if (voiceOverEnabled && !translationEnabled) {
            enableTranslationCheckbox.checked = true;
            translationEnabled = true;
            targetLanguageGroup.style.display = 'block';
            logStatus('Translation automatically enabled for voiceover.');
        }
        
        if (isTranscribing) {
            logStatus('Voiceover setting changed. Please restart to apply changes.');
        }
    });
    
    /**
     * Handle interim results checkbox change
     */
    showInterimResultsCheckbox.addEventListener('change', () => {
        showInterimResults = showInterimResultsCheckbox.checked;
        console.log('Interim results:', showInterimResults ? 'enabled' : 'disabled');
    });
    
    /**
     * Handle save to dashboard checkbox change
     */
    saveToDashboardCheckbox.addEventListener('change', () => {
        saveToDashboard = saveToDashboardCheckbox.checked;
        console.log('Save to dashboard:', saveToDashboard ? 'enabled' : 'disabled');
    });

    /**
     * Update language selector display
     */
    function updateLanguageSelector() {
        let sourceLanguage;
        if (sourceLanguageSelect.value === 'auto') {
            sourceLanguage = detectedLanguage ? detectedLanguage : 'Auto Detect';
        } else if (sourceLanguageSelect.value === 'multilingual') {
            sourceLanguage = 'Multilingual';
        } else {
            sourceLanguage = sourceLanguageSelect.options[sourceLanguageSelect.selectedIndex].text;
        }
        
        const targetLanguage = targetLanguageSelect.options[targetLanguageSelect.selectedIndex].text;
        
        if (translationEnabled) {
            currentLanguages.textContent = `${sourceLanguage} → ${targetLanguage}`;
        } else {
            currentLanguages.textContent = sourceLanguage;
        }
    }

    /**
     * Switch to transcription view
     */
    function showTranscriptionView() {
        // Smooth transition to full-screen transcription
        setupPanel.style.display = 'none';
        transcriptionPanel.style.display = 'flex';
        transcriptionPanel.classList.add('fade-in');
        
        newSessionButton.style.display = 'none';
        restartButton.style.display = 'inline-flex';
        stopButton.style.display = 'inline-flex';
        languageSelector.style.display = 'block';
        
        updateLanguageSelector();
        updateTranscriptionUI();
        updatePromptMessage();
        isTranscribing = true;
    }

    /**
     * Switch to setup view
     */
    function showSetupView() {
        // Smooth transition back to setup
        transcriptionPanel.style.display = 'none';
        setupPanel.style.display = 'flex';
        setupPanel.classList.add('fade-in');
        
        // Reset any positioning issues
        setupPanel.style.position = '';
        setupPanel.style.left = '';
        setupPanel.style.transform = '';
        
        newSessionButton.style.display = 'none';
        restartButton.style.display = 'none';
        stopButton.style.display = 'none';
        languageSelector.style.display = 'none';
        
        // Clear transcription content
        transcriptDiv.innerHTML = '';
        translationDiv.innerHTML = '';
        
        isTranscribing = false;
    }

    /**
     * Update transcription UI layout
     */
    function updateTranscriptionUI() {
        if (translationEnabled) {
            transcriptContainer.classList.add('has-translation');
            originalHeader.textContent = getLanguageDisplayName(sourceLanguageSelect.value);
            translationHeader.textContent = getLanguageDisplayName(targetLanguageSelect.value);
        } else {
            transcriptContainer.classList.remove('has-translation');
            originalHeader.textContent = getLanguageDisplayName(sourceLanguageSelect.value);
        }
    }

    /**
     * Update prompt message based on current audio source
     */
    function updatePromptMessage() {
        const messages = {
            microphone: 'You can start speaking now...',
            hls: 'Processing HLS stream...',
            rtmp: 'Processing RTMP/S stream...',
            rtsp: 'Processing RTSP stream...',
            srt: 'Processing SRT stream...'
        };
        
        const message = messages[currentActiveTab] || 'Processing audio stream...';
        promptMessage.textContent = message;
        
        // Show the prompt message initially
        promptMessage.style.display = 'flex';
    }

    /**
     * Get language display name from language code
     * @param {string} code - Language code
     * @returns {string} Language display name
     */
    function getLanguageDisplayName(code) {
        if (code === 'auto') {
            return 'Auto Detect';
        } else if (code === 'multilingual') {
            return 'Multilingual';
        } else {
            const sourceOption = sourceLanguageSelect.querySelector(`option[value="${code}"]`);
            const targetOption = targetLanguageSelect.querySelector(`option[value="${code}"]`);
            const option = sourceOption || targetOption;
            return option ? option.textContent : code;
        }
    }

    // --- Transcription Logic ---
    
    /**
     * Starts the transcription process
     */
    function startTranscription() {
        if (!apiKeyInput.value.trim()) {
            alert('Please enter an API key.');
            return;
        }
        
        // Validate URL inputs for stream sources
        if (currentActiveTab !== 'microphone') {
            const urlInput = getUrlInputForTab(currentActiveTab);
            if (!urlInput || !urlInput.value.trim()) {
                alert(`Please enter a ${currentActiveTab.toUpperCase()} URL.`);
                return;
            }
        }
        
        // Show loading state
        startButton.classList.add('loading');
        startButton.textContent = 'Connecting...';
        
        // Create WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}`);
        
        ws.onopen = () => {
            logStatus('Connecting...');
            
            translationEnabled = enableTranslationCheckbox.checked;
            voiceOverEnabled = enableVoiceOverCheckbox.checked;
            saveToDashboard = saveToDashboardCheckbox.checked;
            
            let config = {
                apiKey: apiKeyInput.value.trim(),
                host: 'wlive2.maestra.ai',
                port: 443,
                secure: true,
                source: currentActiveTab,
                translationEnabled: translationEnabled,
                voiceOverEnabled: voiceOverEnabled,
                saveToDashboard: saveToDashboard
            };
            
            // Add source language
            const sourceLanguage = sourceLanguageSelect.value;
            if (sourceLanguage && sourceLanguage !== 'auto') {
                config.sourceLanguage = sourceLanguage;
            }
            
            // Add target language if translation is enabled
            if (translationEnabled) {
                config.targetLanguage = targetLanguageSelect.value;
            }

            // Add URL for stream sources
            if (currentActiveTab !== 'microphone') {
                const urlInput = getUrlInputForTab(currentActiveTab);
                config.url = urlInput.value.trim();
            }

            console.log('Sending start config:', config);
            ws.send(JSON.stringify({ type: 'start', config }));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'status':
                    logStatus(message.message);
                    break;
                    
                case 'server-ready':
                    logStatus('Starting...');
                    
                    // Only switch to transcription view if not already there
                    if (!isTranscribing) {
                        showTranscriptionView();
                    }
                    
                    if (currentActiveTab === 'microphone') {
                        startMicrophone();
                    }
                    break;
                    
                case 'interim-transcription':
                    // Hide the prompt message once we start receiving transcription
                    if (promptMessage.style.display !== 'none') {
                        promptMessage.style.display = 'none';
                    }
                    
                    // Only show interim results if the toggle is enabled
                    if (showInterimResults && message.data && message.data.length > 0) {
                        const text = message.data.map(s => s.text).join(' ');
                        updateTranscript(text);
                    }
                    break;
                    
                case 'finalized-transcription':
                    if (message.data && message.data.text) {
                        appendToTranscript(message.data.text);
                    }
                    break;
                    
                case 'interim-translation':
                    // Only show interim translations if both translation and interim results are enabled
                    if (translationEnabled && showInterimResults && message.data && message.data.length > 0) {
                        const text = message.data.map(s => s.text).join(' ');
                        updateTranslation(text);
                    }
                    break;
                    
                case 'finalized-translation':
                    if (translationEnabled && message.data && message.data.text) {
                        appendToTranslation(message.data.text);
                    }
                    break;
                    
                case 'finalized-segment-audio-url':
                    if (voiceOverEnabled && message.data) {
                        playVoiceoverAudio(message.data);
                    }
                    break;
                    
                case 'language-detected':
                    handleLanguageDetection(message);
                    break;
                    
                case 'error':
                    logStatus(`Error: ${message.message}`, true);
                    stopTranscription();
                    break;
            }
        };

        ws.onclose = () => {
            logStatus('Disconnected');
            cleanUpAudio();
            
            // Only reset UI if not manually stopped (to stay on transcription screen when stopped)
            if (isTranscribing) {
                resetUI();
            }
        };

        ws.onerror = (error) => {
            logStatus('Connection failed', true);
            cleanUpAudio();
            resetUI();
        };
    }

    /**
     * Get URL input element for current tab
     * @param {string} tabName - Name of the tab
     * @returns {HTMLElement|null} URL input element
     */
    function getUrlInputForTab(tabName) {
        switch(tabName) {
            case 'hls': return hlsUrl;
            case 'rtmp': return rtmpsUrl;
            case 'rtsp': return rtspUrl;
            case 'srt': return srtUrl;
            default: return null;
        }
    }



    /**
     * Handle language detection
     * @param {Object} message - Language detection message
     */
    function handleLanguageDetection(message) {
        // Handle different possible data formats
        let language;
        if (message.data && message.data.name) {
            language = message.data.name;
        } else if (message.data && typeof message.data === 'string') {
            language = message.data;
        } else if (message.data && message.data.language) {
            language = message.data.language;
        } else {
            language = 'Unknown';
        }
        
        detectedLanguage = language;
        
        // If we're in auto-detect mode, update the source language dropdown to show detected language
        if (sourceLanguageSelect.value === 'auto') {
            console.log('Detected language:', language);
            
            // Create a mapping of common language names to codes
            const languageMap = {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'italian': 'it',
                'portuguese': 'pt',
                'russian': 'ru',
                'japanese': 'ja',
                'korean': 'ko',
                'chinese': 'zh',
                'arabic': 'ar',
                'hindi': 'hi',
                'turkish': 'tr',
                'dutch': 'nl',
                'polish': 'pl',
                'afrikaans': 'af',
                'albanian': 'sq',
                'amharic': 'am',
                'armenian': 'hy',
                'azerbaijani': 'az',
                'basque': 'eu',
                'belarusian': 'be',
                'bengali': 'bn',
                'bosnian': 'bs',
                'bulgarian': 'bg',
                'catalan': 'ca',
                'croatian': 'hr',
                'czech': 'cs',
                'danish': 'da',
                'estonian': 'et',
                'finnish': 'fi',
                'galician': 'gl',
                'georgian': 'ka',
                'greek': 'el',
                'gujarati': 'gu',
                'hebrew': 'he',
                'hungarian': 'hu',
                'icelandic': 'is',
                'indonesian': 'id',
                'javanese': 'jv',
                'kannada': 'kn',
                'kazakh': 'kk',
                'khmer': 'km',
                'lao': 'lo',
                'latin': 'la',
                'latvian': 'lv',
                'lithuanian': 'lt',
                'macedonian': 'mk',
                'malay': 'ms',
                'malayalam': 'ml',
                'maltese': 'mt',
                'marathi': 'mr',
                'mongolian': 'mn',
                'nepali': 'ne',
                'norwegian': 'no',
                'persian': 'fa',
                'punjabi': 'pa',
                'romanian': 'ro',
                'sanskrit': 'sa',
                'serbian': 'sr',
                'sinhala': 'si',
                'slovak': 'sk',
                'slovenian': 'sl',
                'somali': 'so',
                'swahili': 'sw',
                'swedish': 'sv',
                'tagalog': 'tl',
                'tamil': 'ta',
                'telugu': 'te',
                'thai': 'th',
                'ukrainian': 'uk',
                'urdu': 'ur',
                'vietnamese': 'vi',
                'welsh': 'cy',
                'yoruba': 'yo'
            };
            
            // Try to find by language mapping first
            const languageCode = languageMap[language.toLowerCase()];
            if (languageCode) {
                console.log('Found language code:', languageCode);
                sourceLanguageSelect.value = languageCode;
                // Trigger change event to update UI
                sourceLanguageSelect.dispatchEvent(new Event('change'));
            } else {
                // Fallback: try to match by text content
                const options = sourceLanguageSelect.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].textContent.toLowerCase().includes(language.toLowerCase()) || 
                        language.toLowerCase().includes(options[i].textContent.toLowerCase())) {
                        console.log('Found by text match:', options[i].value);
                        sourceLanguageSelect.value = options[i].value;
                        // Trigger change event to update UI
                        sourceLanguageSelect.dispatchEvent(new Event('change'));
                        break;
                    }
                }
            }
            
            console.log('Updated source language to:', sourceLanguageSelect.value);
        }
        
        updateLanguageSelector();
        updateTranscriptionUI();
        logStatus(`${language} detected`);
    }

    /**
     * Stop transcription
     */
    function stopTranscription() {
        if (ws) {
            ws.close();
        }
        cleanUpAudio();
        
        // Stay on transcription screen but hide active buttons and show new session button
        restartButton.style.display = 'none';
        stopButton.style.display = 'none';
        newSessionButton.style.display = 'inline-flex';
        
        // Update status to show stopped
        logStatus('Transcription stopped');
        
        // Reset transcribing state but keep the UI as is
        isTranscribing = false;
    }

    /**
     * Restart transcription with current settings
     */
    function restartTranscription() {
        // Stop current transcription first
        if (ws) {
            ws.close();
        }
        cleanUpAudio();
        
        // Clear transcript content but stay on transcription screen
        transcriptDiv.innerHTML = '';
        translationDiv.innerHTML = '';
        
        // Reset prompt message based on current audio source
        updatePromptMessage();
        
        // Start new transcription with same settings
        logStatus('Restarting...');
        startTranscription();
    }

    /**
     * Reset UI to initial state
     */
    function resetUI() {
        console.log('Resetting UI to initial state');
        showSetupView();
        startButton.classList.remove('loading');
        startButton.textContent = 'Start';
        
        // Reset prompt message - will be updated when transcription starts
        promptMessage.style.display = 'flex';
        promptMessage.textContent = 'You can start speaking now...';
        
        // Reset status
        logStatus('Ready');
        
        console.log('UI reset complete');
    }

    /**
     * Clean up audio resources
     */
    function cleanUpAudio() {
        if (scriptProcessor) {
            scriptProcessor.disconnect();
            scriptProcessor = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
            audioContext = null;
        }
    }

    // --- Audio Processing ---

    /**
     * Start microphone capture
     */
    async function startMicrophone() {
        try {
            console.log('Requesting microphone access...');
            
            if (audioContext && audioContext.state !== 'closed') {
                await audioContext.close();
            }

            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: false 
            });
            
            console.log('Microphone access granted');
            logStatus('Microphone ready');
            
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(mediaStream);
            const targetSampleRate = 16000;

            if (audioContext.audioWorklet) {
                await setupAudioWorklet(source, audioContext.sampleRate, targetSampleRate);
            } else {
                console.warn("AudioWorklet not supported, using ScriptProcessorNode");
                setupScriptProcessor(source, audioContext.sampleRate, targetSampleRate);
            }
            
        } catch (error) {
            console.error('Microphone error:', error);
            logStatus(`Microphone error: ${error.message}`, true);
            stopTranscription();
        }
    }

    /**
     * Setup AudioWorklet for modern browsers
     */
    async function setupAudioWorklet(sourceNode, inputSampleRate, outputSampleRate) {
        const workletCode = `
            class Resampler extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.lastSample = 0;
                    this.nextSample = 0;
                    this.writeIndex = 0;
                }

                process(inputs, outputs, parameters) {
                    const input = inputs[0][0];
                    if (!input) return true;

                    const fromSampleRate = ${inputSampleRate};
                    const toSampleRate = ${outputSampleRate};
                    const ratio = toSampleRate / fromSampleRate;
                    const newLength = Math.ceil(input.length * ratio) + 1;
                    const result = new Float32Array(newLength);
                    let currentWriteIndex = 0;

                    for (let i = 0; i < input.length; i++) {
                        this.lastSample = this.nextSample;
                        this.nextSample = input[i];
                        
                        const highResTime = (currentFrame + i) / fromSampleRate;
                        const nextHighResTime = (currentFrame + i + 1) / fromSampleRate;
                        
                        while(this.writeIndex / toSampleRate < nextHighResTime) {
                            const lowResTime = this.writeIndex / toSampleRate;
                            if (lowResTime < highResTime) {
                                this.writeIndex++;
                                continue;
                            }
                            
                            const timeDiff = lowResTime - highResTime;
                            const sampleTimeDiff = 1 / fromSampleRate;
                            if (sampleTimeDiff === 0) continue;

                            result[currentWriteIndex] = this.lastSample + (this.nextSample - this.lastSample) * (timeDiff / sampleTimeDiff);
                            this.writeIndex++;
                            currentWriteIndex++;
                        }
                    }
                    
                    if (currentWriteIndex > 0) {
                        const finalBuffer = result.slice(0, currentWriteIndex);
                        this.port.postMessage(finalBuffer.buffer, [finalBuffer.buffer]);
                    }

                    return true;
                }
            }
            registerProcessor('resampler', Resampler);
        `;
        
        const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
        const workletURL = URL.createObjectURL(workletBlob);

        await audioContext.audioWorklet.addModule(workletURL);
        const resamplerNode = new AudioWorkletNode(audioContext, 'resampler');

        resamplerNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        sourceNode.connect(resamplerNode);
        URL.revokeObjectURL(workletURL);
    }

    /**
     * Setup ScriptProcessor for older browsers
     */
    function setupScriptProcessor(sourceNode, inputSampleRate, outputSampleRate) {
        const bufferSize = 4096;
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        scriptProcessor.onaudioprocess = (e) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                const resampledData = resample(inputData, inputSampleRate, outputSampleRate);
                ws.send(resampledData.buffer);
            }
        };
        
        sourceNode.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
    }

    /**
     * Resample audio data
     */
    function resample(audioBuffer, fromSampleRate, toSampleRate) {
        if (fromSampleRate === toSampleRate) {
            return audioBuffer;
        }

        const ratio = toSampleRate / fromSampleRate;
        const newLength = Math.ceil(audioBuffer.length * ratio);
        const result = new Float32Array(newLength);
        let writeIndex = 0;
        let lastSample = 0;
        let nextSample = 0;

        for (let i = 0; i < audioBuffer.length; i++) {
            lastSample = nextSample;
            nextSample = audioBuffer[i];
            
            const highResTime = i / fromSampleRate;
            const nextHighResTime = (i + 1) / fromSampleRate;
            
            while(writeIndex / toSampleRate < nextHighResTime) {
                const lowResTime = writeIndex / toSampleRate;
                if (lowResTime < highResTime) {
                    writeIndex++;
                    continue;
                }
                
                const timeDiff = lowResTime - highResTime;
                const sampleTimeDiff = 1 / fromSampleRate;

                result[writeIndex] = lastSample + (nextSample - lastSample) * (timeDiff / sampleTimeDiff);
                writeIndex++;
            }
        }
        return result;
    }

    // --- UI Helpers ---

    /**
     * Log status message
     * @param {string} message - Message to log
     * @param {boolean} isError - Whether this is an error message
     */
    function logStatus(message, isError = false) {
        console.log(isError ? `[ERROR] ${message}` : `[INFO] ${message}`);
        statusDiv.textContent = message;
        if (isError) {
            statusDiv.style.color = '#EF4444';
        } else {
            statusDiv.style.color = '#9CA3AF';
        }
    }

    /**
     * Append text to transcript
     * @param {string} text - Text to append
     */
    function appendToTranscript(text) {
        let lastLine = transcriptDiv.lastElementChild;
        if (lastLine && lastLine.classList.contains('interim')) {
            lastLine.textContent = text;
            lastLine.classList.remove('interim');
        } else {
            const line = document.createElement('div');
            line.textContent = text;
            line.style.marginBottom = '1rem';
            transcriptDiv.appendChild(line);
        }
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    }

    /**
     * Update transcript with interim results
     * @param {string} text - Interim text
     */
    function updateTranscript(text) {
        let lastLine = transcriptDiv.lastElementChild;
        if (lastLine && lastLine.classList.contains('interim')) {
            lastLine.textContent = text;
        } else {
            const newLine = document.createElement('div');
            newLine.textContent = text;
            newLine.classList.add('interim');
            newLine.style.opacity = '0.7';
            newLine.style.marginBottom = '1rem';
            transcriptDiv.appendChild(newLine);
        }
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    }

    /**
     * Append text to translation
     * @param {string} text - Text to append
     */
    function appendToTranslation(text) {
        let lastLine = translationDiv.lastElementChild;
        if (lastLine && lastLine.classList.contains('interim')) {
            lastLine.textContent = text;
            lastLine.classList.remove('interim');
        } else {
            const line = document.createElement('div');
            line.textContent = text;
            line.style.marginBottom = '1rem';
            translationDiv.appendChild(line);
        }
        translationDiv.scrollTop = translationDiv.scrollHeight;
    }

    /**
     * Update translation with interim results
     * @param {string} text - Interim text
     */
    function updateTranslation(text) {
        let lastLine = translationDiv.lastElementChild;
        if (lastLine && lastLine.classList.contains('interim')) {
            lastLine.textContent = text;
        } else {
            const newLine = document.createElement('div');
            newLine.textContent = text;
            newLine.classList.add('interim');
            newLine.style.opacity = '0.7';
            newLine.style.marginBottom = '1rem';
            translationDiv.appendChild(newLine);
        }
        translationDiv.scrollTop = translationDiv.scrollHeight;
    }

    /**
     * Play voiceover audio from URL
     * @param {string} audioUrl - The URL of the audio to play
     */
    function playVoiceoverAudio(audioUrl) {
        try {
            const audio = new Audio(audioUrl);
            audio.crossOrigin = 'anonymous';
            
            audio.addEventListener('play', () => {
                console.log('🎵 Voiceover audio started playing');
                logStatus('🎵 Playing voiceover audio');
            });
            
            audio.addEventListener('ended', () => {
                console.log('⏹️ Voiceover audio ended');
            });
            
            audio.addEventListener('error', (event) => {
                console.error('❌ Voiceover audio error:', event);
                logStatus('❌ Voiceover audio failed to play', true);
            });
            
            // Attempt to play
            audio.play().catch(error => {
                if (error.name === 'NotAllowedError') {
                    console.warn('🚫 Voiceover autoplay blocked');
                    logStatus('🚫 Voiceover autoplay blocked - click anywhere to enable', true);
                    
                    // Add click handler to enable audio
                    const enableAudio = () => {
                        audio.play()
                            .then(() => {
                                logStatus('🎵 Voiceover audio enabled');
                                document.removeEventListener('click', enableAudio);
                            })
                            .catch(err => console.error('Failed to play after user interaction:', err));
                    };
                    document.addEventListener('click', enableAudio, { once: true });
                } else {
                    console.error('Voiceover playback error:', error);
                    logStatus('❌ Voiceover playback failed', true);
                }
            });
            
        } catch (error) {
            console.error('Error creating voiceover audio:', error);
            logStatus('❌ Voiceover error', true);
        }
    }

    // --- Event Listeners ---
    
    startButton.addEventListener('click', startTranscription);
    stopButton.addEventListener('click', stopTranscription);
    restartButton.addEventListener('click', restartTranscription);
    newSessionButton.addEventListener('click', () => {
        console.log('New Session button clicked');
        // Reset to setup view for new session
        resetUI();
    });
    
    // Language selection updates
    sourceLanguageSelect.addEventListener('change', updateLanguageSelector);
    targetLanguageSelect.addEventListener('change', updateLanguageSelector);
    
    // Initialize the app
    initializeTabs();
    updateLanguageSelector();
    
    // Set initial status
    logStatus('Ready');
}); 