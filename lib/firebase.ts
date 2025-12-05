import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Check if Firebase config is available and valid
function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  // Validate that all required config values are present and non-empty
  // Also check that API key looks valid (not just whitespace or placeholder)
  if (!apiKey || !projectId || 
      apiKey.trim() === '' || projectId.trim() === '' ||
      apiKey === 'undefined' || projectId === 'undefined') {
    return null;
  }

  const config = {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return config;
}

// Check if we're in a build environment
function isBuildTime(): boolean {
  // During Next.js build, check for build-specific environment variables
  // Only return true during actual build, not at runtime
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.NEXT_PHASE === 'phase-development-build';
}

// Initialize Firebase instances
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function initializeFirebase() {
  // Return cached instances if already initialized
  if (_app && _auth && _db) {
    return;
  }

  const config = getFirebaseConfig();
  
  // If config is missing during build, skip initialization
  if (!config) {
    if (isBuildTime()) {
      return; // Silently skip during build
    }
    // At runtime, throw error if config is missing
    throw new Error('Firebase configuration is missing. Please check your environment variables.');
  }

  try {
    // Return existing app if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      _app = existingApps[0];
    } else {
      _app = initializeApp(config);
    }
    
    _auth = getAuth(_app);
    _db = getFirestore(_app);
  } catch (error: any) {
    // During build, gracefully handle errors
    if (isBuildTime()) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error?.code || '';
      
      // If it's an invalid API key error during build, just skip initialization
      if (errorCode === 'auth/invalid-api-key' || errorMessage.includes('invalid-api-key')) {
        console.warn('Firebase initialization skipped during build due to invalid API key. This is expected if environment variables are not set in the build environment.');
        return;
      }
      
      console.warn('Firebase initialization skipped during build:', errorMessage);
      return;
    }
    // At runtime, throw the error
    throw error;
  }
}

// Initialize Firebase on module load
initializeFirebase();

// Export getter functions that return the real instances
// These will be called when the exports are accessed
function getAuthInstance(): Auth {
  if (!_auth) {
    // Try to initialize if not already done
    initializeFirebase();
    if (!_auth) {
      // During build, return a placeholder that will fail at runtime
      if (isBuildTime()) {
        // This should never be reached at runtime, but we need to return something for TypeScript
        throw new Error('Firebase Auth not available during build. This is expected.');
      }
      throw new Error('Firebase Auth not initialized. Please check your environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, etc.)');
    }
  }
  return _auth;
}

function getDbInstance(): Firestore {
  if (!_db) {
    // Try to initialize if not already done
    initializeFirebase();
    if (!_db) {
      // During build, throw an error that won't break the build
      if (isBuildTime()) {
        throw new Error('Firebase Firestore not available during build. This is expected.');
      }
      // At runtime, provide a detailed error message
      const config = getFirebaseConfig();
      if (!config) {
        throw new Error('Firebase Firestore not initialized. Missing environment variables. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and other Firebase environment variables are set in Vercel.');
      }
      throw new Error('Firebase Firestore not initialized. Please check your environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, etc.)');
    }
  }
  // Ensure we're returning a real Firestore instance
  if (!_db || typeof _db !== 'object') {
    throw new Error('Firebase Firestore instance is invalid. This should not happen.');
  }
  return _db;
}

function getAppInstance(): FirebaseApp {
  if (!_app) {
    // Try to initialize if not already done
    initializeFirebase();
    if (!_app) {
      // During build, return a placeholder that will fail at runtime
      if (isBuildTime()) {
        // This should never be reached at runtime, but we need to return something for TypeScript
        throw new Error('Firebase app not available during build. This is expected.');
      }
      throw new Error('Firebase app not initialized. Please check your environment variables.');
    }
  }
  return _app;
}

// Export the real instances directly
// These are the actual Firestore/Auth instances, not proxies
// At runtime, these will always be real instances (initialization will succeed or throw)
// During build, if initialization fails, the exports will be undefined, but that's okay
// because the API routes are marked as force-dynamic and won't execute during build
export const auth = getAuthInstance();
export const db = getDbInstance();
export default getAppInstance();
