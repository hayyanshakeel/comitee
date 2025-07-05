
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import type { Payment } from '@/lib/types';

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
    throw new Error(`Internal Server Error: Could not initialize Firebase Admin SDK. Details: ${error.message}`);
  }
};

export async function POST(req: Request) {
  try {
    initializeAdmin();
    const db = admin.firestore();

    const { userId, userName, month, year } = await req.json();

    if (!userId || !userName || !month || !year) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // --- Fetch billing settings ---
    const settingsRef = db.collection('settings').doc('billing');
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists || !settingsDoc.data()?.monthlyBillingAmount) {
      return NextResponse.json({ message: 'Monthly billing amount is not set. Please set it in the admin settings first.' }, { status: 400 });
    }
    const monthlyBillingAmount = settingsDoc.data()!.monthlyBillingAmount;

    // Check if a payment for this month/year already exists for this user
    const paymentsRef = db.collection('payments');
    const q = paymentsRef
      .where('userId', '==', userId)
      .where('month', '==', month)
      .where('year', '==', Number(year));
    
    const existingPaymentSnapshot = await q.get();

    if (!existingPaymentSnapshot.empty) {
        return NextResponse.json({ message: `A payment record for ${month} ${year} already exists for this user.` }, { status: 409 });
    }

    const newPayment: Omit<Payment, 'id'> = {
      userId,
      userName,
      amount: Number(monthlyBillingAmount),
      month,
      year: Number(year),
      status: 'Pending',
    };

    const docRef = await db.collection('payments').add(newPayment);
    
    return NextResponse.json({ message: 'Missed payment added successfully', paymentId: docRef.id });

  } catch (error: any) {
    console.error('Error recording missed payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Failed to record payment: ${errorMessage}` }, { status: 500 });
  }
}
