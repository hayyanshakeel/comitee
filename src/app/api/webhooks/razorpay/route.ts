import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  // adminDb will be null if the Admin SDK was not initialized.
  if (!adminDb) {
    console.error('Firebase Admin SDK is not initialized. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set.');
    return NextResponse.json({ error: 'Server is not configured to write to the database.' }, { status: 500 });
  }

  try {
    // Use the dedicated webhook secret for verification
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables.');
      return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
    }

    const rawBody = await request.text();
    const razorpaySignature = request.headers.get('x-razorpay-signature');

    if (!razorpaySignature) {
      return NextResponse.json({ error: 'Signature missing' }, { status: 400 });
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');

    if (digest !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const body = JSON.parse(rawBody);

    // We are only interested in successful payment events
    if (body.event === 'payment.captured') {
      const paymentEntity = body.payload.payment.entity;
      const { userId, month, year } = paymentEntity.notes;

      if (!userId || !month || !year) {
        console.error('Missing user details in payment notes', paymentEntity.notes);
        return NextResponse.json({ error: 'Missing user details in payment notes' }, { status: 400 });
      }

      // Record the payment in Firestore using the Admin SDK
      const paymentsRef = adminDb.collection('users').doc(userId).collection('payments');
      await paymentsRef.add({
        receiptId: paymentEntity.id,
        paymentDate: new Date(paymentEntity.created_at * 1000).toISOString(),
        amount: paymentEntity.amount / 100,
        month,
        year: parseInt(year, 10),
        method: 'Online',
      });
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook handler failed', details: error.message }, { status: 500 });
  }
}
