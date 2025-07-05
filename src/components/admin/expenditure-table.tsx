
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, FileDown, Loader2 } from 'lucide-react';
import type { Expenditure } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';

interface ExpenditureTableProps {
  expenditures: Expenditure[];
}

export function ExpenditureTable({ expenditures }: ExpenditureTableProps) {
  const { toast } = useToast();

  const [isAddExpenditureOpen, setIsAddExpenditureOpen] = React.useState(false);
  const [isDeleteExpenditureOpen, setIsDeleteExpenditureOpen] = React.useState(false);
  const [selectedExpenditure, setSelectedExpenditure] = React.useState<Expenditure | null>(null);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newExpenditureDescription, setNewExpenditureDescription] = React.useState('');
  const [newExpenditureAmount, setNewExpenditureAmount] = React.useState('');
  const [formError, setFormError] = React.useState('');

  const resetAddExpenditureForm = () => {
    setNewExpenditureDescription('');
    setNewExpenditureAmount('');
    setFormError('');
  }

  const handleAddExpenditure = async () => {
    setFormError('');
    const amountNumber = parseFloat(newExpenditureAmount);
    if (!newExpenditureDescription || !newExpenditureAmount || isNaN(amountNumber) || amountNumber <= 0) {
        setFormError('Please fill in all fields with valid values.');
        return;
    }
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/manage-expenditure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: newExpenditureDescription, amount: amountNumber }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to add expenditure.');
        }
        toast({ title: 'Success', description: 'Expenditure has been added successfully.' });
        setIsAddExpenditureOpen(false);
        resetAddExpenditureForm();
    } catch (err: any) {
        setFormError(err.message);
        console.error("Error adding expenditure:", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteExpenditure = async () => {
    if (!selectedExpenditure) return;
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/manage-expenditure', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenditureId: selectedExpenditure.id }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete expenditure.');
        }
        toast({ title: 'Success', description: data.message });
        setIsDeleteExpenditureOpen(false);
        setSelectedExpenditure(null);
    } catch (err: any) {
        console.error("Error deleting expenditure:", err);
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const openDeleteDialog = (expenditure: Expenditure) => {
    setSelectedExpenditure(expenditure);
    setIsDeleteExpenditureOpen(true);
  }

  const exportExpenditureData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Description,Amount\n"
      + expenditures.map(e => `${format(new Date(e.date), 'yyyy-MM-dd')},"${e.description.replace(/"/g, '""')}",${e.amount}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenditure_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpenditure = expenditures.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div>
            <CardTitle>Expenditures</CardTitle>
            <CardDescription className="mt-2">
              Total spent: <span className='font-bold text-foreground'>₹{totalExpenditure.toLocaleString()}</span>. Manage all welfare expenses here.
            </CardDescription>
          </div>
          <div className='flex gap-2'>
            <Button onClick={exportExpenditureData} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsAddExpenditureOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[150px]'>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className='w-[150px]'>Amount</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenditures.map((expenditure) => (
                <TableRow key={expenditure.id}>
                  <TableCell className="font-medium">{format(new Date(expenditure.date), 'PPP')}</TableCell>
                  <TableCell>{expenditure.description}</TableCell>
                  <TableCell>₹{expenditure.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(expenditure)}>
                        <span className="sr-only">Delete</span>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
            ))}
            {expenditures.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className='text-center h-24'>No expenditures recorded yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isAddExpenditureOpen} onOpenChange={(open) => { setIsAddExpenditureOpen(open); if (!open) resetAddExpenditureForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expenditure</DialogTitle>
            <DialogDescription>Record a new expense. It will be added to the ledger.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newExpenditureDescription} onChange={(e) => setNewExpenditureDescription(e.target.value)} placeholder="e.g., Office supplies" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" value={newExpenditureAmount} onChange={(e) => setNewExpenditureAmount(e.target.value)} placeholder="e.g., 5000" />
            </div>
            {formError && <p className="text-center text-xs font-medium text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleAddExpenditure} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteExpenditureOpen} onOpenChange={setIsDeleteExpenditureOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this expenditure record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpenditure} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete expenditure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
