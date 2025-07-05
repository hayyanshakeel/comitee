
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { PaymentCards } from '@/components/user/payment-cards';
import { PaymentHistoryTable } from '@/components/user/payment-history-table';
import type { Payment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserDashboardPage() {
  const [userName, setUserName] = useState<string>('');
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserName(docSnap.data().name);
          } else {
            setUserName(user.displayName || 'User');
          }
          setUserLoading(false);
        }, (error) => {
            console.error("Error fetching user data:", error);
            setUserName(user.displayName || 'User');
            setUserLoading(false);
        });

        const paymentsRef = collection(db, "payments");
        const q = query(paymentsRef, where("userId", "==", user.uid));
        
        const unsubscribePayments = onSnapshot(q, (querySnapshot) => {
          const paymentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
          
          paymentsData.sort((a, b) => {
              if (a.year !== b.year) {
                  return b.year - a.year;
              }
              const monthsOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              return monthsOrder.indexOf(b.month) - monthsOrder.indexOf(a.month);
          });

          setUserPayments(paymentsData);
          setPaymentsLoading(false);
        }, (error) => {
            console.error("Error fetching payments: ", error);
            setPaymentsLoading(false);
        });
        
        return () => {
          unsubscribeUser();
          unsubscribePayments();
        };
      } else {
        setUserLoading(false);
        setPaymentsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  const totalPaid = userPayments
    .filter(p => p.status === 'Paid')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPending = userPayments
    .filter(p => p.status === 'Pending')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="space-y-1 text-center">
        {userLoading ? (
            <>
                <Skeleton className="h-9 w-1/2 mx-auto rounded-md" />
                <Skeleton className="h-5 w-3/4 mx-auto rounded-md" />
            </>
        ) : (
            <>
                <h1 className="text-3xl font-bold font-headline">Assalamualaikum, {userName}</h1>
                <p className="text-muted-foreground">Welcome back! Here's an overview of your account.</p>
            </>
        )}
      </div>
      <PaymentCards 
        totalPaid={totalPaid} 
        totalPending={totalPending} 
        isLoading={paymentsLoading}
      />
      <PaymentHistoryTable 
        payments={userPayments} 
        isLoading={paymentsLoading}
      />
    </div>
  );
}
