
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { OverviewCards } from '@/components/admin/overview-cards';
import { PaymentChart } from '@/components/admin/payment-chart';
import { UsersWithPendingPaymentsTable } from '@/components/admin/users-with-pending-payments-table';
import type { Payment, Expenditure } from '@/lib/types';

export default function AdminDashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [expendituresLoading, setExpendituresLoading] = useState(true);

  useEffect(() => {
    const unsubPayments = onSnapshot(collection(db, "payments"), (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      setPayments(paymentsData);
      setPaymentsLoading(false);
    }, (error) => {
      console.error("Error fetching payments: ", error);
      setPaymentsLoading(false);
    });

    const unsubExpenditures = onSnapshot(collection(db, "expenditures"), (snapshot) => {
      const expendituresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expenditure));
      setExpenditures(expendituresData);
      setExpendituresLoading(false);
    }, (error) => {
        console.error("Error fetching expenditures: ", error);
        setExpendituresLoading(false);
    });

    return () => {
      unsubPayments();
      unsubExpenditures();
    };
  }, []);


  const totalPaid = payments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.amount, 0);
  const totalExpenditure = expenditures.reduce((acc, e) => acc + e.amount, 0);
  const totalRaised = totalPaid + totalPending;

  const monthlyData: { [key: string]: { month: string; paid: number; pending: number } } = {};
  payments.forEach(p => {
    const monthName = p.month || 'Unknown';
    // Use a consistent key format, e.g., "Jan 2023"
    const monthKey = `${monthName.substring(0, 3)} ${p.year}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthName.substring(0, 3), paid: 0, pending: 0 };
    }
    if (p.status === 'Paid') {
      monthlyData[monthKey].paid += p.amount;
    } else {
      monthlyData[monthKey].pending += p.amount;
    }
  });
  
  const chartData = Object.values(monthlyData);
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const pendingPayments = payments.filter(p => p.status === 'Pending' && p.month === currentMonth);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      <OverviewCards 
        totalRaised={totalRaised} 
        totalPaid={totalPaid} 
        totalPending={totalPending} 
        totalExpenditure={totalExpenditure} 
        isLoading={paymentsLoading || expendituresLoading} 
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <PaymentChart data={chartData} isLoading={paymentsLoading} />
        </div>
        <div className="lg:col-span-3">
          <UsersWithPendingPaymentsTable pendingPayments={pendingPayments} isLoading={paymentsLoading} />
        </div>
      </div>
    </div>
  );
}
