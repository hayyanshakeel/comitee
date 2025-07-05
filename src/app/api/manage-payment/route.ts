
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

const initializeAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('Firebase service account key is not set in environment variables. The Admin SDK needs this to function.');
    }
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const serviceAccount = JSON.parse(serviceAccountString);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
    // Throw a more specific error to help with debugging
    throw new Error(`Internal Server Error: Could not initialize Firebase Admin SDK. Details: ${error.message}`);
  }
};

export async function DELETE(req: Request) {
    try {
        initializeAdmin();
        const db = admin.firestore();
        const { paymentId } = await req.json();

        if (!paymentId) {
            return NextResponse.json({ message: 'Payment ID is required' }, { status: 400 });
        }
        
        await db.collection('payments').doc(paymentId).delete();
        
        return NextResponse.json({ message: 'Payment has been deleted successfully.' });

    } catch (error: any) {
        console.error('Error deleting payment:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: `Failed to delete payment: ${errorMessage}` }, { status: 500 });
    }
}
