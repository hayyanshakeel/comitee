
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import admin from 'firebase-admin';
import type { Payment, User } from '@/lib/types';

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

// Initialize Razorpay client
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay API keys are not configured in environment variables.');
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req: Request) {
  try {
    initializeAdmin();
    const db = admin.firestore();

    const { paymentIds, baseUrl } = await req.json();

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ message: 'Payment IDs array is required' }, { status: 400 });
    }
    if (!baseUrl) {
        return NextResponse.json({ message: 'Base URL is required for callback' }, { status: 400 });
    }

    let totalAmount = 0;
    let userId = '';
    let userName = '';
    let description = '';
    const months: string[] = [];

    const paymentDocs = await Promise.all(paymentIds.map((id: string) => db.collection('payments').doc(id).get()));

    for (const paymentDoc of paymentDocs) {
        if (!paymentDoc.exists) {
            return NextResponse.json({ message: `Payment with ID ${paymentDoc.id} not found.` }, { status: 404 });
        }
        const payment = paymentDoc.data() as Payment;
        if (payment.status === 'Paid') {
            return NextResponse.json({ message: `Payment for ${payment.month} ${payment.year} has already been completed.` }, { status: 400 });
        }
        totalAmount += payment.amount;
        months.push(`${payment.month} ${payment.year}`);
        userId = payment.userId;
        userName = payment.userName;
    }

    if (paymentIds.length > 1) {
        description = `Bundled payment for UQBA Hub for ${months.join(', ')}`;
    } else {
        description = `Payment for UQBA Hub for ${months[0]}`;
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const user = userDoc.data() as User;


    const notes = paymentIds.length === 1 
        ? { paymentId: paymentIds[0], userId, userName }
        : { paymentIds: paymentIds.join(','), userId, userName };


    const options = {
      amount: totalAmount * 100, // Amount in the smallest currency unit (paise for INR)
      currency: 'INR',
      accept_partial: false,
      description,
      customer: {
        name: userName,
        email: user.email,
        contact: user.mobile,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes,
      callback_url: `${baseUrl}/dashboard`,
      callback_method: 'get' as const,
    };

    const paymentLink = await razorpay.paymentLink.create(options);

    return NextResponse.json({ short_url: paymentLink.short_url });

  } catch (error) {
    console.error('Error creating Razorpay payment link:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Failed to create payment link: ${errorMessage}` }, { status: 500 });
  }
}
