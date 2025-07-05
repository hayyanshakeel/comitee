
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import type { Expenditure } from '@/lib/types';

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

    const { description, amount } = await req.json();

    if (!description || !amount || amount <= 0) {
      return NextResponse.json({ message: 'Missing or invalid required fields.' }, { status: 400 });
    }

    const newExpenditure: Omit<Expenditure, 'id'> = {
      description,
      amount,
      date: new Date().toISOString(),
    };

    const docRef = await db.collection('expenditures').add(newExpenditure);
    
    return NextResponse.json({ message: 'Expenditure created successfully', expenditureId: docRef.id });

  } catch (error: any) {
    console.error('Error creating expenditure:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Failed to create expenditure: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        initializeAdmin();
        const db = admin.firestore();
        const { expenditureId } = await req.json();

        if (!expenditureId) {
            return NextResponse.json({ message: 'Expenditure ID is required' }, { status: 400 });
        }
        
        await db.collection('expenditures').doc(expenditureId).delete();
        
        return NextResponse.json({ message: 'Expenditure has been deleted.' });

    } catch (error: any) {
        console.error('Error deleting expenditure:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: `Failed to delete expenditure: ${errorMessage}` }, { status: 500 });
    }
}
