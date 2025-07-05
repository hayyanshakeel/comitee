
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AddMissedPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User | null;
}

const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

export function AddMissedPaymentDialog({ isOpen, setIsOpen, user }: AddMissedPaymentDialogProps) {
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState(new Date().getFullYear().toString());
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const { toast } = useToast();

  const resetForm = () => {
    setMonth('');
    setYear(new Date().getFullYear().toString());
    setFormError('');
  }

  const handleSavePayment = async () => {
    if (!user || !month || !year) {
      setFormError('Please fill in all fields.');
      return;
    }
    setIsSaving(true);
    setFormError('');

    try {
      const response = await fetch('/api/record-missed-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          month,
          year: Number(year),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add missed payment.');
      }

      toast({ title: 'Success', description: 'Missed payment has been added as pending.' });
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding missed payment:', error);
      setFormError(error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Missed Payment for {user.name}</DialogTitle>
          <DialogDescription>
            Create a new 'Pending' payment for a past month. This will use the current default billing amount from settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="month-select">Month</Label>
                    <Select onValueChange={setMonth} value={month}>
                        <SelectTrigger id="month-select">
                            <SelectValue placeholder="Select month..." />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g., 2024" />
                </div>
            </div>
            {formError && <p className="text-center text-xs font-medium text-destructive">{formError}</p>}
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
          <Button onClick={handleSavePayment} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Pending Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
