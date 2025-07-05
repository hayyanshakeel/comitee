
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { User, Payment } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ManagePaymentsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User | null;
  payments: Payment[];
}

export function ManagePaymentsDialog({ isOpen, setIsOpen, user, payments }: ManagePaymentsDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [paymentToDelete, setPaymentToDelete] = React.useState<Payment | null>(null);
  const { toast } = useToast();

  const userPayments = payments
    .filter(p => p.userId === user?.id)
    .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return months.indexOf(b.month) - months.indexOf(a.month);
    });

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/manage-payment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentToDelete.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete payment.');
      }

      toast({ title: 'Success', description: 'Payment has been deleted.' });
      setPaymentToDelete(null); // This closes the alert dialog
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Payments for {user.name}</DialogTitle>
            <DialogDescription>
              View and delete payment records. Deleting a payment is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month & Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid On</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPayments.length > 0 ? (
                  userPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.month} {payment.year}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'Paid' ? 'secondary' : 'outline'} className={payment.status === 'Paid' ? 'text-green-600' : 'text-orange-600'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.paidOn ? format(new Date(payment.paidOn), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setPaymentToDelete(payment)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Payment</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No payment records found for this user.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the payment record for {paymentToDelete?.month} {paymentToDelete?.year}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
