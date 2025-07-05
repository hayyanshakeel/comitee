
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Expenditure } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, Loader2, IndianRupee, PlusCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const expenditureSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0.'),
  date: z.date({ required_error: 'An expenditure date is required.' }),
});

type ExpenditureFormValues = z.infer<typeof expenditureSchema>;

export default function AdminExpenditurePage() {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenditureToDelete, setExpenditureToDelete] = useState<Expenditure | null>(null);
  const { toast } = useToast();

  const form = useForm<ExpenditureFormValues>({
    resolver: zodResolver(expenditureSchema),
    defaultValues: {
      description: '',
      date: new Date(),
    },
  });

  const fetchExpenditures = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'expenditures'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const expenditureList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expenditure));
      setExpenditures(expenditureList);
    } catch (error) {
      console.error('Error fetching expenditures:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load expenditures.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenditures();
  }, [toast]);

  const onSubmit = async (values: ExpenditureFormValues) => {
    if (!db) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'expenditures'), {
        ...values,
        date: values.date.toISOString(),
      });
      toast({ title: 'Expenditure Added', description: 'The new expense has been recorded.' });
      form.reset({ description: '', amount: undefined, date: new Date() });
      fetchExpenditures(); // Refresh the list
    } catch (error) {
      console.error('Error adding expenditure:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not record the expense.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpenditure = async () => {
    if (!expenditureToDelete || !db) return;
    try {
        await deleteDoc(doc(db, "expenditures", expenditureToDelete.id));
        toast({ title: "Expenditure Deleted", description: "The expense has been removed." });
        fetchExpenditures();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
    } finally {
        setExpenditureToDelete(null);
    }
  };

  return (
    <>
    <div className="grid gap-4 md:grid-cols-5">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Record New Expenditure</CardTitle>
            <CardDescription>Enter the details of the expense to record it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office supplies" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (INR)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-8" placeholder="e.g., 1500" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Expenditure</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Expense
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Expenditure History</CardTitle>
            <CardDescription>A list of all recorded committee expenditures.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <Skeleton className="h-64 w-full" />
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenditures.length > 0 ? (
                    expenditures.map((exp) => (
                        <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.description}</TableCell>
                        <TableCell>{format(new Date(exp.date), 'PPP')}</TableCell>
                        <TableCell className="text-right">INR {exp.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setExpenditureToDelete(exp)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No expenditures recorded yet.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    <AlertDialog open={!!expenditureToDelete} onOpenChange={(open) => !open && setExpenditureToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the expenditure entry.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpenditure} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
