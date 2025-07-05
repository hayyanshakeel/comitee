
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User, Payment } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface RecordPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User;
  payments: Payment[];
}

export function RecordPaymentDialog({ isOpen, setIsOpen, user, payments }: RecordPaymentDialogProps) {
  const [selectedPaymentId, setSelectedPaymentId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const pendingPayments = payments.filter(p => p.status === 'Pending');

  const handleSavePayment = async () => {
    if (!selectedPaymentId) {
      toast({ title: 'Error', description: 'Please select a payment to mark as paid.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const paymentRef = doc(db, 'payments', selectedPaymentId);
      await updateDoc(paymentRef, {
        status: 'Paid',
        paidOn: new Date().toISOString(),
      });
      toast({ title: 'Success', description: 'Payment recorded successfully.' });
      setIsOpen(false);
      setSelectedPaymentId(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({ title: 'Error', description: 'Failed to record payment.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment for {user.name}</DialogTitle>
          <DialogDescription>Manually mark a pending payment as 'Paid'. This is for payments made offline.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {pendingPayments.length > 0 ? (
                <div className="grid gap-2">
                    <Label htmlFor="payment-select">Select Pending Payment</Label>
                    <Select onValueChange={setSelectedPaymentId} value={selectedPaymentId || ''}>
                        <SelectTrigger id="payment-select">
                            <SelectValue placeholder="Select a payment..." />
                        </SelectTrigger>
                        <SelectContent>
                            {pendingPayments.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.month} {p.year} - ₹{p.amount}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <p className="text-sm text-center text-muted-foreground">This user has no pending payments.</p>
            )}
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
          <Button onClick={handleSavePayment} disabled={!selectedPaymentId || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
