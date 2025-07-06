
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { format } from 'date-fns';

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

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables.');
    return NextResponse.json({ message: 'Webhook handler is not configured.' }, { status: 500 });
  }

  try {
    initializeAdmin();
    const db = admin.firestore();

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
        return NextResponse.json({ message: 'Signature missing' }, { status: 400 });
    }

    // 1. Verify the signature
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
        console.warn('Webhook signature verification failed.');
        return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
    }
    
    // 2. Process the event
    const event = JSON.parse(body);
    
    // For reliability with Payment Links, only process the 'payment_link.paid' event.
    if (event.event === 'payment_link.paid') {
        const paymentLink = event.payload.payment_link.entity;
        const payment = event.payload.payment.entity;
        const notes = paymentLink.notes;
        const razorpayPaymentId = payment.id;

        if (notes && razorpayPaymentId) {
            if (notes.paymentIds) {
                // Bundled payment logic
                const paymentIds = notes.paymentIds.split(',');
                const batch = db.batch();
                paymentIds.forEach((id: string) => {
                    const paymentRef = db.collection('payments').doc(id);
                    batch.update(paymentRef, {
                        status: 'Paid',
                        paidOn: new Date().toISOString(),
                        razorpay_payment_id: razorpayPaymentId,
                    });
                });
                await batch.commit();
                console.log(`Bundled payments ${notes.paymentIds} successfully marked as Paid.`);
            } else if (notes.paymentId) {
                // Single payment logic
                const paymentRef = db.collection('payments').doc(notes.paymentId);
                await paymentRef.update({
                    status: 'Paid',
                    paidOn: new Date().toISOString(),
                    razorpay_payment_id: razorpayPaymentId,
                });
                console.log(`Payment ${notes.paymentId} successfully marked as Paid.`);
            } else {
                console.error(`Webhook for ${event.event} received but paymentId or paymentIds missing in notes.`);
            }
        }
    } else {
        console.log(`Webhook received for unhandled event: ${event.event}. Ignoring.`);
    }

    // 3. Acknowledge the event
    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Error in webhook handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Webhook handler failed: ${errorMessage}` }, { status: 500 });
  }
}
