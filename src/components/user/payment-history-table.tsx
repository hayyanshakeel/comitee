
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Payment } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface PaymentHistoryTableProps {
  payments: Payment[];
  isLoading: boolean;
}

export function PaymentHistoryTable({ payments, isLoading }: PaymentHistoryTableProps) {
  const { toast } = useToast();
  const [payingId, setPayingId] = React.useState<string | null>(null);

  const handlePay = async (paymentsToPay: Payment[]) => {
    const paymentIdToTrack = paymentsToPay.length > 1 ? 'bundled' : paymentsToPay[0].id;
    setPayingId(paymentIdToTrack);

    try {
        const paymentIds = paymentsToPay.map(p => p.id);
        const baseUrl = window.location.origin;

        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIds, baseUrl }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create payment link.');
        }

        if (data.short_url) {
            window.location.href = data.short_url;
        } else {
            throw new Error('Payment link URL not received from server.');
        }

    } catch (error) {
        console.error("Payment initiation failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        setPayingId(null);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'Pending');
  const totalPendingAmount = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

  const renderSkeleton = () => (
     <TableBody>
        {[...Array(5)].map((_, i) => (
            <TableRow key={i} className="flex-col md:flex-row items-start md:items-center">
                <TableCell className="w-full md:w-auto">
                    <Skeleton className="h-5 w-32 rounded-md" />
                    <div className="md:hidden mt-2"><Skeleton className="h-4 w-20 rounded-md" /></div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-5 w-24 ml-auto rounded-md" /></TableCell>
                <TableCell className="w-full md:w-auto text-center"><Skeleton className="h-6 w-20 mx-auto md:mx-0 rounded-full" /></TableCell>
                <TableCell className="w-full md:w-auto text-right"><Skeleton className="h-9 w-24 ml-auto rounded-md" /></TableCell>
            </TableRow>
        ))}
    </TableBody>
  );
  
  const BundledPaymentCard = () => (
      <Card className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h3 className="font-bold text-lg text-amber-900 dark:text-amber-200">You have multiple pending payments</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Total Amount Due: <span className="font-bold text-foreground">₹{totalPendingAmount.toLocaleString()}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    For months: {pendingPayments.map(p => `${p.month.substring(0,3)} ${p.year}`).join(', ')}
                </p>
            </div>
            <Button 
                onClick={() => handlePay(pendingPayments)} 
                className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={payingId === 'bundled'}
            >
                {payingId === 'bundled' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay Total Due
            </Button>
        </CardContent>
      </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {!isLoading && pendingPayments.length > 1 && <BundledPaymentCard />}
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Details</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? renderSkeleton() : (
                 <TableBody>
                    {payments.length > 0 ? (
                        payments.map((payment) => (
                            <TableRow key={payment.id} className="flex-col md:flex-row items-start md:items-center py-2 md:py-0">
                                <TableCell className="font-medium w-full md:w-auto">
                                    {payment.month} {payment.year}
                                    <div className="text-sm text-muted-foreground md:hidden mt-1">
                                        ₹{payment.amount.toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right">₹{payment.amount.toLocaleString()}</TableCell>
                                <TableCell className="w-full md:w-auto text-center">
                                    {payment.status === 'Paid' ? (
                                    <>
                                        <Badge variant='secondary' className='w-20 justify-center bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700'>
                                            Paid
                                        </Badge>
                                        {payment.paidOn && <div className="text-xs text-muted-foreground mt-1 text-center">{format(new Date(payment.paidOn), 'PP')}</div>}
                                    </>
                                    ) : (
                                    <Badge variant='outline' className='w-20 justify-center text-orange-600 border-orange-400 dark:text-orange-400 dark:border-orange-600'>
                                        Pending
                                    </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="w-full md:w-auto text-right">
                                    {payment.status === 'Pending' && pendingPayments.length <= 1 && (
                                        <Button 
                                            onClick={() => handlePay([payment])} 
                                            size="sm" 
                                            className="bg-accent text-accent-foreground hover:bg-accent/90 w-full md:w-auto mt-2 md:mt-0"
                                            disabled={payingId === payment.id}
                                        >
                                            {payingId === payment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Pay Now
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No payment history found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
              )}
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
