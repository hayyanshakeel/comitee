
'use client';

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { Payment } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { createRazorpayOrder } from '@/app/actions/payment';

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, CalendarClock, FileText, CreditCard, Loader2 } from "lucide-react"

declare global {
    interface Window {
        Razorpay: any;
    }
}

const ALL_MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const CURRENT_YEAR = new Date().getFullYear();

export default function UserDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null); // To track which month is being paid

  useEffect(() => {
    if (!user || !db) {
        setLoading(false);
        return;
    }

    setLoading(true);
    
    // Fetch settings once
    const settingsDocRef = doc(db, 'app_settings', 'payment');
    getDoc(settingsDocRef).then(settingsDoc => {
        if (settingsDoc.exists()) {
            setMonthlyFee(settingsDoc.data().monthlyFee || 500);
        } else {
            setMonthlyFee(500); // Default fee
        }
    }).catch(error => {
        console.error("Error fetching settings: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load monthly fee settings.' });
    });

    // Listen for real-time payment updates
    const paymentsRef = collection(db, "users", user.uid, "payments");
    const q = query(paymentsRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const paymentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        paymentList.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return ALL_MONTHS.indexOf(b.month) - ALL_MONTHS.indexOf(a.month);
        });
        setPayments(paymentList);
        setLoading(false);
    }, (error: any) => {
        console.error("Error fetching payments: ", error);
        let description = 'Could not load your payment data.';
        if (error.code === 'permission-denied') {
            description = "You don't have permission to view payments. Please ensure Firestore security rules are deployed as per the README file.";
        }
        toast({ variant: 'destructive', title: 'Data Fetch Error', description: description });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handlePayment = async (month: string, year: number, amount: number) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to pay." });
      return;
    }

    setIsPaying(`${month}-${year}`);

    try {
      const orderDetails = {
        amount,
        month,
        year,
        userId: user.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
      };

      const result = await createRazorpayOrder(orderDetails);

      if (result.error || !result.orderId || !result.keyId) {
        throw new Error(result.error || "An unknown error occurred while creating the order.");
      }
      
      const { orderId, keyId } = result;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency: "INR",
        name: "Uqba Committee",
        description: `Fee for ${month} ${year}`,
        order_id: orderId,
        handler: function (response: any) {
            toast({ title: "Payment Successful", description: "Your payment record will be updated shortly."});
        },
        prefill: {
            name: userProfile.name,
            email: userProfile.email,
        },
        notes: {
            month,
            year: year.toString(),
            userId: user.uid
        },
        theme: {
            color: "#4C389E"
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: response.error.description || 'Something went wrong.'
        });
      });
      rzp.open();

    } catch (error: any) {
      console.error("Payment initiation error: ", error);
      toast({ variant: "destructive", title: "Payment Error", description: error.message || "Could not initiate payment." });
    } finally {
      setIsPaying(null);
    }
  };


  const generateReceipt = (payment: Payment) => {
    if (!userProfile) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Uqba Committee", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Payment Receipt", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.text(`User: ${userProfile?.name}`, 14, 40);
    doc.text(`Email: ${userProfile?.email}`, 14, 45);

    autoTable(doc, {
        startY: 55,
        head: [['Description', 'Details']],
        body: [
            ['Receipt ID', payment.receiptId],
            ['Payment Date', format(new Date(payment.paymentDate), "PPP")],
            ['Month & Year', `${payment.month} ${payment.year}`],
            ['Payment Method', payment.method],
            ['Amount Paid', `INR ${payment.amount.toLocaleString('en-IN')}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [76, 56, 158] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.text(`This is a computer-generated receipt and does not require a signature.`, 14, finalY + 10);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, finalY + 15);

    doc.output('dataurlnewwindow');
  };

  const paymentStatusThisYear = ALL_MONTHS.map(month => {
    const isPaid = payments.find(p => p.month === month && p.year === CURRENT_YEAR);
    let status: 'Paid' | 'Pending' | 'Upcoming' | 'N/A' = 'Upcoming';
    let isDue = false;

    if (userProfile?.createdAt) {
      const creationDate = new Date(userProfile.createdAt);
      const monthIndex = ALL_MONTHS.indexOf(month);
      const currentDate = new Date();
      
      const isAfterCreation = CURRENT_YEAR > creationDate.getFullYear() || 
                             (CURRENT_YEAR === creationDate.getFullYear() && monthIndex >= creationDate.getMonth());
      
      if (!isAfterCreation) {
        status = 'N/A';
      } else if (isPaid) {
        status = 'Paid';
      } else if (monthIndex <= currentDate.getMonth()) {
        status = 'Pending';
        isDue = true;
      }
    }

    return { month, status, isDue };
  });

  const paymentHistory = payments;
  const totalPaid = paymentHistory.reduce((acc, p) => acc + p.amount, 0);
  
  const nextDueMonth = paymentStatusThisYear.find(p => p.status === 'Pending');
  const nextDueDate = nextDueMonth ? `1st ${nextDueMonth.month} ${CURRENT_YEAR}` : 'All clear!';
  
  return (
    <div className="flex flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <span className="text-sm text-muted-foreground">INR</span>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <>
              <div className="text-2xl font-bold">{totalPaid.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground">{paymentHistory.length} lifetime payments</p>
            </>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
             <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-8 w-3/4" /> : <>
              <div className="text-2xl font-bold">{nextDueDate}</div>
              <p className="text-xs text-muted-foreground">{nextDueMonth ? 'Payment is pending' : 'No overdue payments'}</p>
             </>}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status for {CURRENT_YEAR}</CardTitle>
            <CardDescription>
              Your payment status for the current year. The monthly fee is INR {monthlyFee}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40 w-full"/> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentStatusThisYear.map(({ month, status, isDue }) => (
                  <TableRow key={month} className={status === 'N/A' ? 'text-muted-foreground' : ''}>
                    <TableCell>
                      <div className="font-medium">{month}</div>
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge variant={status === 'Paid' ? 'secondary' : status === 'Pending' ? 'destructive' : 'outline'} className={status === 'Paid' ? 'bg-green-100 text-green-800' : ''}>
                        {status === 'Paid' ? <CheckCircle2 className="mr-2 h-4 w-4"/> : status === 'Pending' ? <XCircle className="mr-2 h-4 w-4"/> : null}
                        {status}
                      </Badge>
                    </TableCell>
                     <TableCell className="text-right">
                      {isDue && (
                         <Button
                            size="sm"
                            onClick={() => handlePayment(month, CURRENT_YEAR, monthlyFee)}
                            disabled={isPaying !== null}
                          >
                           {isPaying === `${month}-${CURRENT_YEAR}` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           ) : (
                              <CreditCard className="mr-2 h-4 w-4" />
                           )}
                           Pay Now
                         </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Complete Payment History</CardTitle>
            <CardDescription>A record of all your past payments.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40 w-full"/> : (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Details</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.length > 0 ? paymentHistory.map((payment) => (
                   <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{payment.month} {payment.year}</div>
                       <div className="text-sm text-muted-foreground">
                        {payment.method} &bull; {payment.receiptId}
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="text-sm">
                        {format(new Date(payment.paymentDate), "PPP")}
                      </div>
                    </TableCell>
                    <TableCell>INR {payment.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" onClick={() => generateReceipt(payment)} className="h-8 w-8">
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View Receipt</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No payment history.</TableCell></TableRow>}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
