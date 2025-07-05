export interface User {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  mobile?: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  month: string;
  year: number;
  status: 'Paid' | 'Pending';
  paidOn?: string;
  razorpay_payment_id?: string;
}

export interface Expenditure {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
}
