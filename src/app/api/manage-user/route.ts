
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import type { User, Payment } from '@/lib/types';

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

export async function POST(req: Request) {
  try {
    initializeAdmin();
    const db = admin.firestore();

    const { name, email, password, mobile } = await req.json();

    if (!name || !email || !password || !mobile) {
      return NextResponse.json({ message: 'Missing required fields: name, email, password, and mobile are required.' }, { status: 400 });
    }

    // --- Fetch billing settings ---
    const settingsRef = db.collection('settings').doc('billing');
    const settingsDoc = await settingsRef.get();
    // Get the amount, defaulting to 0 if not set. This prevents an error if settings aren't configured.
    const monthlyBillingAmount = settingsDoc.exists ? (settingsDoc.data() as { monthlyBillingAmount: number }).monthlyBillingAmount : 0;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create user document in Firestore
    const newUser: Omit<User, 'id'> = {
      name,
      email,
      joinDate: new Date().toISOString(),
      mobile,
    };
    await db.collection('users').doc(userRecord.uid).set(newUser);

    // --- Automatically create the first pending payment for the new user ---
    // This will now proceed even if the billing amount is 0.
    // The admin will need to ensure the billing amount is set correctly in settings for payments to work.
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const newPaymentRef = db.collection('payments').doc();
    const newPayment: Omit<Payment, 'id'> = {
        userId: userRecord.uid,
        userName: name,
        amount: monthlyBillingAmount,
        month: currentMonth,
        year: currentYear,
        status: 'Pending',
    };
    await newPaymentRef.set(newPayment);
    
    return NextResponse.json({ message: 'User created successfully and initial bill generated.', userId: userRecord.uid });

  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
    }
    if (error.code === 'auth/invalid-password') {
        return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Failed to create user: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        initializeAdmin();
        const db = admin.firestore();
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }
        
        await admin.auth().deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        
        const paymentsQuery = db.collection('payments').where('userId', '==', userId);
        const paymentsSnapshot = await paymentsQuery.get();
        
        if (!paymentsSnapshot.empty) {
            const batch = db.batch();
            paymentsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        
        return NextResponse.json({ message: 'User and their payment history have been deleted.' });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error.code === 'auth/user-not-found') {
             return NextResponse.json({ message: 'User not found.' }, { status: 404 });
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: `Failed to delete user: ${errorMessage}` }, { status: 500 });
    }
}
