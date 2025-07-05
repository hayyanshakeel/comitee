
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

    const { userId, userName, amount, month, year } = await req.json();

    if (!userId || !userName || !amount || !month || !year) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    if (amount <= 0) {
        return NextResponse.json({ message: 'Amount must be a positive number.' }, { status: 400 });
    }

    const newPayment: Omit<Payment, 'id'> = {
      userId,
      userName,
      amount: Number(amount),
      month,
      year: Number(year),
      status: 'Paid',
      paidOn: new Date().toISOString(),
    };

    const docRef = await db.collection('payments').add(newPayment);
    
    return NextResponse.json({ message: 'Payment recorded successfully', paymentId: docRef.id });

  } catch (error: any) {
    console.error('Error recording manual payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Failed to record payment: ${errorMessage}` }, { status: 500 });
  }
}
