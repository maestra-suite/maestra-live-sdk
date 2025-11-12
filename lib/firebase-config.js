const admin = require('firebase-admin');

// Firebase configuration (matching the server configuration)
const FIREBASE_CONFIG = {
  databaseURL: 'https://maestro-218920.firebaseio.com/',
  storageBucket: 'gs://maestro-218920.appspot.com'
};

let firebaseApp = null;
let firebaseDb = null;

/**
 * Initialize Firebase Admin SDK
 * @param {Object} options - Firebase initialization options
 * @param {Object} options.credential - Firebase credential (optional, uses default if not provided)
 */
function initializeFirebase(options = {}) {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const config = {
      ...FIREBASE_CONFIG,
      credential: options.credential || admin.credential.applicationDefault()
    };

    firebaseApp = admin.initializeApp(config);
    firebaseDb = admin.database();
    
    console.log('[Firebase] Initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    throw error;
  }
}

/**
 * Update captioner settings in Firebase database
 * @param {string} uid - User Firebase UID
 * @param {Object} settings - Settings to update
 * @param {string} settings.sourceLanguage - Source language code
 * @param {string} settings.targetLanguage - Target language code (optional)
 * @param {boolean} settings.translationEnabled - Enable translation
 * @param {boolean} settings.autoVoiceCloning - Enable auto voice cloning
 * @param {string} settings.voiceId - Voice ID for TTS
 */
async function updateCaptionerSettings(uid, settings) {
  if (!firebaseDb) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }

  try {
    const updates = {};

    // Update whisper settings
    if (settings.sourceLanguage !== undefined) {
      updates[`captionerSettings/${uid}/whisper/sourceLanguage`] = settings.sourceLanguage;
    }
    
    if (settings.targetLanguage !== undefined) {
      updates[`captionerSettings/${uid}/whisper/targetLanguage`] = settings.targetLanguage;
    }
    
    if (settings.translationEnabled !== undefined) {
      updates[`captionerSettings/${uid}/whisper/translationEnabled`] = settings.translationEnabled;
    }

    // Update voiceover settings if voice-related options are provided
    if (settings.targetLanguage && (settings.autoVoiceCloning !== undefined || settings.voiceId !== undefined)) {
      const voiceoverPath = `captionerSettings/${uid}/voiceover/${settings.targetLanguage}`;
      
      if (settings.autoVoiceCloning !== undefined) {
        updates[`${voiceoverPath}/isAutoVoiceCloning`] = settings.autoVoiceCloning;
        updates[`${voiceoverPath}/voiceoverEnabled`] = settings.translationEnabled || false;
      }
      
      if (settings.voiceId) {
        updates[`${voiceoverPath}/selectedSpeakers`] = [{ voiceId: settings.voiceId }];
        updates[`${voiceoverPath}/voiceoverEnabled`] = settings.translationEnabled || false;
      }
      
      updates[`${voiceoverPath}/code`] = settings.targetLanguage;
    }

    // Perform atomic update
    await firebaseDb.ref().update(updates);
    
    console.log('[Firebase] Captioner settings updated successfully for UID:', uid);
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to update captioner settings:', error);
    throw error;
  }
}

/**
 * Get user UID from API key (matching server implementation)
 * @param {string} apiKey - Maestra API key
 * @returns {string|null} - User UID if found, null otherwise
 */
async function getUidFromApiKey(apiKey) {
  if (!firebaseDb) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }

  try {
    // Use the same method as the server: direct lookup by API key
    const userInfoRef = firebaseDb.ref(`apiKeys/${apiKey}`);
    const snapshot = await userInfoRef.once('value');
    const userInfo = snapshot.val();
    
    if (userInfo && userInfo.uid) {
      console.log(`[Firebase] API key lookup successful for key: ${apiKey.substring(0, 8)}...`);
      return userInfo.uid;
    }
    
    return null;
  } catch (error) {
    console.error('[Firebase] Failed to get UID from API key:', error);
    return null;
  }
}

module.exports = {
  initializeFirebase,
  updateCaptionerSettings,
  getUidFromApiKey,
  get firebaseDb() { return firebaseDb; },
  get firebaseApp() { return firebaseApp; }
};
