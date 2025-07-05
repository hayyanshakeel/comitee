// This file is no longer used for data.
// The app now fetches real-time data from Firestore.
// You can populate your Firestore database with collections for 'users', 'payments', and 'settings'.
import type { User, Payment } from './types';

export const users: User[] = [];

export const payments: Payment[] = [];

export const settings = {
  monthlyBillingAmount: 0,
};
