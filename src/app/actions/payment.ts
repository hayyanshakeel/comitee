'use server';

import Razorpay from 'razorpay';
import { z } from 'zod';
import crypto from 'crypto';

const orderSchema = z.object({
  amount: z.number().positive(),
  month: z.string(),
  year: z.number(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string().email(),
});

export async function createRazorpayOrder(values: z.infer<typeof orderSchema>): Promise<{
  orderId?: string;
  keyId?: string;
  error?: string;
}> {
  try {
    const validation = orderSchema.safeParse(values);
    if (!validation.success) {
      console.error('Invalid Razorpay order data:', validation.error.flatten());
      return { error: 'Invalid input data for creating order.' };
    }

    const { amount, month, year, userId, userName, userEmail } = validation.data;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay environment variables (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are not set.');
      return { error: 'Payment processing is not configured on the server. Please contact an administrator.' };
    }

    const instance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // SAFE: Short unique ID + optional timestamp, always sliced to 40
    const randomHex = crypto.randomBytes(6).toString('hex'); // 12 chars
    const rawReceiptId = `rcpt_${randomHex}_${Date.now()}`;
    const receiptId = rawReceiptId.slice(0, 40);

    console.log('Raw receipt ID:', rawReceiptId, 'Length:', rawReceiptId.length);
    console.log('Final receipt ID:', receiptId, 'Length:', receiptId.length);

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: 'INR',
      receipt: receiptId,
      notes: {
        userId,
        month,
        year: year.toString(),
        userName,
        userEmail,
      },
    };

    console.log('Final Razorpay options:', JSON.stringify(options, null, 2));

    const order = await instance.orders.create(options);

    if (!order) {
      return { error: 'Failed to create Razorpay order (order is null).' };
    }

    return {
      orderId: order.id,
      keyId: razorpayKeyId,
    };
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);

    const errorMessage =
      error?.error?.description ||
      error.message ||
      'Could not create payment order. An unknown error occurred.';

    return { error: errorMessage };
  }
}
