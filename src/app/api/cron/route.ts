
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


export async function GET() {
  try {
    initializeAdmin();
    const db = admin.firestore();
    
    console.log('Cron job started: Generating monthly bills...');

    // 1. Fetch the current monthly billing amount from settings
    const settingsRef = db.collection('settings').doc('billing');
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      console.error('Billing settings not found.');
      return NextResponse.json({ ok: false, message: 'Billing settings not found.' }, { status: 500 });
    }
    const { monthlyBillingAmount } = settingsDoc.data() as { monthlyBillingAmount: number };
    
    if (!monthlyBillingAmount || monthlyBillingAmount <= 0) {
      console.error('Monthly billing amount is not set or is invalid.');
      return NextResponse.json({ ok: false, message: 'Monthly billing amount is not set or is invalid.' }, { status: 500 });
    }

    // 2. Fetch all users
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    // 3. For each user, create a new 'Pending' payment for the current month if it doesn't exist
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const batch = db.batch();
    let billsCreatedCount = 0;

    for (const user of users) {
      // Don't create bills for the admin user
      if (user.email === 'sheikhhayyaan@gmail.com') {
        continue;
      }

      const paymentsRef = db.collection('payments');
      const q = paymentsRef
        .where('userId', '==', user.id)
        .where('month', '==', currentMonth)
        .where('year', '==', currentYear);
      
      const existingPaymentSnapshot = await q.get();
      
      if (existingPaymentSnapshot.empty) {
        const newPaymentRef = paymentsRef.doc(); // Auto-generate ID
        const newPayment: Omit<Payment, 'id'> = {
          userId: user.id,
          userName: user.name,
          amount: monthlyBillingAmount,
          month: currentMonth,
          year: currentYear,
          status: 'Pending',
        };
        batch.set(newPaymentRef, newPayment);
        billsCreatedCount++;
        console.log(`Creating bill for ${user.name} for ${currentMonth} ${currentYear}`);
      } else {
        console.log(`Bill for ${user.name} for ${currentMonth} ${currentYear} already exists.`);
      }
    }
    
    if (billsCreatedCount > 0) {
      await batch.commit();
    }
    
    const message = `Monthly bills generation complete. ${billsCreatedCount} new bills created.`;
    console.log(message);
    
    return NextResponse.json({ ok: true, message });

  } catch (error) {
    console.error('Error in cron job:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ ok: false, message: `Cron job failed: ${errorMessage}` }, { status: 500 });
  }
}
