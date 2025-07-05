
export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string; // ISO string
}

export interface Payment {
    id: string; // document id
    receiptId: string;
    month: string;
    year: number;
    amount: number;
    paymentDate: string; // ISO string
    method: 'Cash' | 'Online';
}

export interface AdminUserView {
    id:string;
    name: string;
    email: string;
    paidMonths: number;
    totalMonths: number;
    status: 'Active' | 'Pending';
    createdAt: string;
}

export interface Expenditure {
    id: string;
    description: string;
    amount: number;
    date: string; // ISO string
}

export interface PaymentSettings {
  monthlyFee: number;
  razorpayKeyId: string;
  razorpayKeySecret: string;
}
