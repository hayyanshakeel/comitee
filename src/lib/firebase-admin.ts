import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// This file initializes the Firebase Admin SDK for server-side operations.
// It's designed to work in environments like Vercel by using a service account key
// stored in an environment variable.

let adminDbInstance: admin.firestore.Firestore | null = null;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    adminDbInstance = getFirestore();
    return;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK features will be disabled.');
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminDbInstance = getFirestore();
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize Firebase Admin SDK.', e);
    }
  }
}

initializeAdminApp();

// Export the initialized instance. It will be null if initialization failed.
export { adminDbInstance as adminDb };
