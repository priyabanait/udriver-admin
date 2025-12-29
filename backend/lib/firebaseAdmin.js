import admin from 'firebase-admin';
import fs from 'fs';

// Initialize Firebase Admin SDK using (in order of preference):
// 1) FIREBASE_SERVICE_ACCOUNT_JSON env var (stringified JSON)
// 2) GOOGLE_APPLICATION_CREDENTIALS env var (ADC)
// 3) Local service account JSON file checked into backend/ (for local dev only)

function initFirebase() {
  try {
    // Check if already initialized
    if (admin.apps && admin.apps.length > 0) {
      console.log('✅ Firebase admin already initialized');
      return admin;
    }

    let initialized = false;

    // 1) FIREBASE_SERVICE_ACCOUNT_JSON
    // eslint-disable-next-line no-undef
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        // eslint-disable-next-line no-undef
        const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({ 
          credential: admin.credential.cert(json),
          projectId: json.project_id
        });
        console.log('✅ Firebase admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON');
        initialized = true;
      } catch (err) {
        console.error('❌ Failed to initialize from FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
      }
    }

    // 2) GOOGLE_APPLICATION_CREDENTIALS - allow default behavior
    // eslint-disable-next-line no-undef
    if (!initialized && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        admin.initializeApp();
        console.log('✅ Firebase admin initialized using GOOGLE_APPLICATION_CREDENTIALS');
        initialized = true;
      } catch (err) {
        console.error('❌ Failed to initialize from GOOGLE_APPLICATION_CREDENTIALS:', err.message);
      }
    }

    // 3) Local JSON file (fallback for local development)
    if (!initialized) {
      const localPath = new URL('../udrive-fba78-firebase-adminsdk-fbsvc-eb39dc3bcf.json', import.meta.url).pathname;
      if (fs.existsSync(localPath)) {
        try {
          const json = JSON.parse(fs.readFileSync(localPath, 'utf8'));
          admin.initializeApp({ 
            credential: admin.credential.cert(json),
            projectId: json.project_id
          });
          console.log('✅ Firebase admin initialized from local service account file');
          initialized = true;
        } catch (err) {
          console.error('❌ Failed to initialize from local file:', err.message);
        }
      }
    }

    if (!initialized) {
      console.warn('⚠️ No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
      console.warn('⚠️ Push notifications will be disabled until Firebase is configured.');
    } else {
      // Verify messaging is available
      try {
        const messaging = admin.messaging();
        if (messaging) {
          console.log('✅ Firebase messaging service is available');
          // Check for available methods
          if (typeof messaging.sendEach === 'function') {
            console.log('✅ sendEach method is available (recommended for multiple tokens)');
          } else if (typeof messaging.sendEachForMulticast === 'function') {
            console.log('✅ sendEachForMulticast method is available (alternative)');
          } else if (typeof messaging.sendMulticast === 'function') {
            console.log('✅ sendMulticast method is available (legacy - deprecated)');
          } else {
            console.warn('⚠️ No multicast methods available, will use individual send');
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not verify messaging service:', err.message);
      }
    }

    return admin;
  } catch (err) {
    console.error('❌ Failed to initialize Firebase admin:', err.message);
    console.error('Error stack:', err.stack);
    return admin;
  }
}

// Initialize Firebase on module load
initFirebase();

export function getAdmin() {
  return admin;
}

export function isFirebaseInitialized() {
  return admin.apps && admin.apps.length > 0;
}

/**
 * Test Firebase messaging service
 * Returns status information about Firebase initialization
 */
export function getFirebaseStatus() {
  const initialized = isFirebaseInitialized();
  const status = {
    initialized,
    hasApps: admin.apps && admin.apps.length > 0,
    appCount: admin.apps ? admin.apps.length : 0,
  };

  if (initialized) {
    try {
      const messaging = admin.messaging();
      status.messagingAvailable = !!messaging;
      // Check for sendEachForMulticast (new method) or sendMulticast (old deprecated method)
      status.sendEachForMulticastAvailable = typeof messaging?.sendEachForMulticast === 'function';
      status.sendMulticastAvailable = typeof messaging?.sendMulticast === 'function';
      status.sendEachAvailable = typeof messaging?.sendEach === 'function';
      status.sendAvailable = typeof messaging?.send === 'function';
    } catch (err) {
      status.messagingError = err.message;
    }
  }

  return status;
}

/**
 * Test sending a notification to verify Firebase is working
 * This is a test function - don't use in production
 */
export async function testFirebaseNotification(testToken) {
  if (!testToken) {
    return { error: 'Test token required' };
  }

  const status = getFirebaseStatus();
  if (!status.initialized) {
    return { error: 'Firebase not initialized', status };
  }

  if (!status.messagingAvailable) {
    return { error: 'Messaging service not available', status };
  }

  try {
    const result = await sendPushToTokens([testToken], {
      title: 'Firebase Test',
      body: 'This is a test notification',
      data: { test: 'true' }
    });

    return { success: true, result, status };
  } catch (err) {
    return { error: err.message, status };
  }
}

// Send push notification to multiple device tokens using FCM
export async function sendPushToTokens(tokens = [], { title = '', body = '', data = {} } = {}) {
  if (!tokens || !tokens.length) {
    return { successCount: 0, failureCount: 0 };
  }

  // Check if Firebase Admin is initialized
  if (!admin.apps || admin.apps.length === 0) {
    console.warn('⚠️ Firebase Admin not initialized. Skipping push notification.');
    return { successCount: 0, failureCount: tokens.length, error: 'Firebase not initialized' };
  }

  try {
    // Get messaging service
    let messaging;
    try {
      messaging = admin.messaging();
      if (!messaging) {
        throw new Error('Messaging service is null');
      }
    } catch (err) {
      console.error('❌ Failed to get messaging service:', err.message);
      return { successCount: 0, failureCount: tokens.length, error: 'Messaging service unavailable' };
    }

    // Prepare data payload (convert all values to strings as required by FCM)
    const dataPayload = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        dataPayload[String(key)] = String(value);
      }
    }

    // Try sendEachForMulticast first (Firebase Admin SDK v11+ - recommended method)
    if (typeof messaging.sendEachForMulticast === 'function') {
      try {
        const message = {
          notification: { 
            title: String(title || ''), 
            body: String(body || '') 
          },
          data: dataPayload,
          tokens: tokens.slice(0, 500), // FCM supports up to 500 tokens per call
        };

        const res = await messaging.sendEachForMulticast(message);
        console.log(`✅ FCM sendEachForMulticast: ${res.successCount} successful, ${res.failureCount} failed`);
        
        // Log detailed failure information
        if (res.failureCount > 0 && res.responses) {
          res.responses.forEach((response, index) => {
            if (!response.success) {
              console.error(`❌ Failed to send to token ${index + 1}:`, {
                error: response.error?.code || 'Unknown error',
                message: response.error?.message || 'No error message',
                token: tokens[index]?.substring(0, 20) + '...'
              });
            }
          });
        }
        
        return { 
          successCount: res.successCount, 
          failureCount: res.failureCount, 
          responses: res.responses 
        };
      } catch (err) {
        console.error('❌ sendEachForMulticast failed:', err.message);
        console.error('Error code:', err.code);
        console.error('Error details:', err);
        // Fall through to try other methods
      }
    }

    // Try sendMulticast (legacy method - deprecated but may still work in older SDK versions)
    if (typeof messaging.sendMulticast === 'function') {
      try {
        const message = {
          notification: { 
            title: String(title || ''), 
            body: String(body || '') 
          },
          data: dataPayload,
          tokens: tokens.slice(0, 500), // FCM sendMulticast supports up to 500 tokens per call
        };

        const res = await messaging.sendMulticast(message);
        console.log(`✅ FCM sendMulticast (legacy): ${res.successCount} successful, ${res.failureCount} failed`);
        
        // Log detailed failure information
        if (res.failureCount > 0 && res.responses) {
          res.responses.forEach((response, index) => {
            if (!response.success) {
              console.error(`❌ Failed to send to token ${index + 1}:`, {
                error: response.error?.code || 'Unknown error',
                message: response.error?.message || 'No error message',
                token: tokens[index]?.substring(0, 20) + '...'
              });
            }
          });
        }
        
        return { 
          successCount: res.successCount, 
          failureCount: res.failureCount, 
          responses: res.responses 
        };
      } catch (err) {
        console.error('❌ sendMulticast failed:', err.message);
        console.error('Error code:', err.code);
        console.error('Error details:', err);
        // Fall through to try other methods
      }
    }

    // Use sendEach (Firebase Admin SDK v9+) - Primary method since sendMulticast is deprecated
    if (typeof messaging.sendEach === 'function') {
      try {
        console.log('📱 Using sendEach method (recommended for multiple tokens)');
        const messages = tokens.slice(0, 500).map(token => ({
          token: String(token),
          notification: { 
            title: String(title || ''), 
            body: String(body || '') 
          },
          data: dataPayload,
        }));

        const res = await messaging.sendEach(messages);
        console.log(`✅ FCM sendEach: ${res.successCount} successful, ${res.failureCount} failed`);
        
        // Log detailed failure information
        const invalidTokens = [];
        if (res.failureCount > 0 && res.responses) {
          res.responses.forEach((response, index) => {
            if (!response.success) {
              const errorCode = response.error?.code;
              const errorMsg = response.error?.message || 'No error message';
              console.error(`❌ Failed to send to token ${index + 1}:`, {
                error: errorCode || 'Unknown error',
                message: errorMsg,
                token: tokens[index]?.substring(0, 20) + '...'
              });
              
              // Track invalid tokens for cleanup
              if (errorCode === 'messaging/invalid-registration-token' || 
                  errorCode === 'messaging/registration-token-not-registered') {
                invalidTokens.push(tokens[index]);
              }
            }
          });
        }
        
        return { 
          successCount: res.successCount, 
          failureCount: res.failureCount, 
          responses: res.responses,
          invalidTokens: invalidTokens.length > 0 ? invalidTokens : undefined
        };
      } catch (err) {
        console.error('❌ sendEach failed:', err.message);
        console.error('Error code:', err.code);
        console.error('Error details:', err);
        // Fall through to individual sends
      }
    }

    // Final fallback: Send individually (slower but most compatible)
    console.log('⚠️ Using individual send fallback method');
    let successCount = 0;
    let failureCount = 0;
    const responses = [];
    const tokensToSend = tokens.slice(0, 100); // Limit to 100 for individual sends to avoid timeout
    const invalidTokens = []; // Track invalid tokens for cleanup

    for (const token of tokensToSend) {
      try {
        const message = {
          token: String(token),
          notification: { 
            title: String(title || ''), 
            body: String(body || '') 
          },
          data: dataPayload,
        };
        
        await messaging.send(message);
        successCount++;
        responses.push({ success: true });
      } catch (err) {
        failureCount++;
        const errorCode = err.code || 'unknown';
        const errorMsg = err.message || 'Unknown error';
        responses.push({ success: false, error: errorMsg, errorCode });
        
        // Log detailed error information
        console.error(`❌ Failed to send to token ${token.substring(0, 30)}...:`, {
          errorCode,
          errorMessage: errorMsg,
          fullError: err
        });
        
        // Track invalid tokens for cleanup
        if (errorCode === 'messaging/invalid-registration-token' || 
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-argument') {
          invalidTokens.push(token);
          console.warn(`⚠️ Invalid/expired token detected: ${token.substring(0, 30)}... (${errorCode})`);
        }
      }
    }

    console.log(`✅ FCM individual sends: ${successCount} successful, ${failureCount} failed`);
    
    // Return invalid tokens so they can be cleaned up
    if (invalidTokens.length > 0) {
      return { 
        successCount, 
        failureCount, 
        responses,
        invalidTokens // Include invalid tokens for cleanup
      };
    }
    
    return { successCount, failureCount, responses };

  } catch (err) {
    console.error('❌ FCM send error:', err.message);
    console.error('Error code:', err.code);
    console.error('Error stack:', err.stack);
    return { 
      successCount: 0, 
      failureCount: tokens.length, 
      error: err.message || 'Unknown error',
      errorCode: err.code 
    };
  }
}
