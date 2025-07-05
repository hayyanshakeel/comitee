
'use client'

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, collection, addDoc, getDocs, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserProfile, Payment } from "@/lib/types"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from 'jspdf-autotable'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, Loader2, ArrowLeft, IndianRupee, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const paymentSchema = z.object({
  month: z.string().nonempty({ message: "Please select a month." }),
  year: z.coerce.number().min(2020, "Invalid year.").max(new Date().getFullYear() + 1, "Invalid year."),
  amount: z.coerce.number().min(1, { message: "Amount must be greater than 0." }),
  paymentDate: z.date({ required_error: "A payment date is required." }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function UserPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      year: new Date().getFullYear(),
    },
  });

  const watchedMonth = form.watch("month");
  const watchedYear = form.watch("year");

  const calendarMonth = React.useMemo(() => {
    if (watchedMonth && watchedYear) {
      const monthIndex = MONTHS.indexOf(watchedMonth);
      if (monthIndex !== -1) {
        return new Date(watchedYear, monthIndex, 1);
      }
    }
    return undefined;
  }, [watchedMonth, watchedYear]);

  useEffect(() => {
    const loadData = async () => {
      if (!db || !userId) return;
      setLoading(true);
      try {
        // Fetch settings, user, and payments in parallel
        const settingsDocRef = doc(db, 'app_settings', 'payment');
        const userDocRef = doc(db, 'users', userId);
        const paymentsRef = collection(db, 'users', userId, 'payments');

        const [settingsDoc, userDoc, paymentsSnapshot] = await Promise.all([
            getDoc(settingsDocRef),
            getDoc(userDocRef),
            getDocs(query(paymentsRef))
        ]);

        // Process settings
        const fetchedMonthlyFee = settingsDoc.exists() ? settingsDoc.data().monthlyFee : 500;
        setMonthlyFee(fetchedMonthlyFee);
        form.reset({ year: new Date().getFullYear(), amount: fetchedMonthlyFee });

        // Process user
        if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as UserProfile);
        } else {
            toast({ variant: "destructive", title: "User not found" });
            router.push('/admin/users');
            return;
        }

        // Process payments
        const paymentList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        paymentList.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
        });
        setPayments(paymentList);

      } catch (e) {
        console.error("Error loading page data:", e);
        toast({ variant: "destructive", title: "Error", description: "Could not load user data and payments." });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId, toast, router, form]);

  const generateReceipt = (payment: Payment, userProfile: UserProfile | null) => {
    if (!userProfile) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Uqba Committee", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Payment Receipt", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.text(`User: ${userProfile.name}`, 14, 40);
    doc.text(`Email: ${userProfile.email}`, 14, 45);

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

  const handleRecordPayment = async (values: PaymentFormValues) => {
    if (!db || !userId) return;

    const existingPayment = payments.find(p => p.month === values.month && p.year === values.year);
    if(existingPayment) {
        toast({ variant: "destructive", title: "Payment already exists", description: `A payment for ${values.month} ${values.year} has already been recorded.` });
        return;
    }

    setIsSubmitting(true);
    try {
      const receiptId = `CASH-${Date.now()}`;
      const paymentsRef = collection(db, 'users', userId, 'payments');
      await addDoc(paymentsRef, {
        ...values,
        receiptId,
        paymentDate: values.paymentDate.toISOString(),
        method: 'Cash',
      });
      toast({ title: "Payment Recorded", description: "The cash payment has been successfully recorded." });
      // Refetch payments to update the list
      const querySnapshot = await getDocs(query(collection(db, 'users', userId, 'payments')));
       const paymentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        paymentList.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
        });
      setPayments(paymentList);
      form.reset({ year: new Date().getFullYear(), amount: monthlyFee, month: '', paymentDate: undefined });

    } catch (error) {
      console.error("Error recording payment:", error);
      toast({ variant: "destructive", title: "Failed to Record Payment" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" disabled className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        <div className="grid gap-4 md:grid-cols-5">
          <Skeleton className="md:col-span-2 h-[500px]" />
          <Skeleton className="md:col-span-3 h-[500px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <p>User not found.</p>;
  }
  
  const availableMonths = MONTHS.filter(month => 
    !payments.some(p => p.month === month && p.year === form.watch('year'))
  );

  return (
    <div className="space-y-4">
       <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
      </Button>
      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Record New Payment</CardTitle>
              <CardDescription>Manually record a cash payment for {user.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRecordPayment)} className="space-y-6">
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Month</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableMonths.length > 0 ? (
                                availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)
                              ) : (
                                <p className="p-2 text-sm text-muted-foreground">All months paid for this year.</p>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (INR)</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="number" className="pl-8" {...field} />
                            </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Payment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              month={calendarMonth}
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting || availableMonths.length === 0} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Record Payment
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Showing all recorded payments for {user.name} ({user.email}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month & Year</TableHead>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Date Paid</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length > 0 ? (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.month} {p.year}</TableCell>
                        <TableCell><Badge variant="outline">{p.receiptId}</Badge></TableCell>
                        <TableCell>{format(new Date(p.paymentDate), "PPP")}</TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell className="text-right">INR {p.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="icon" onClick={() => generateReceipt(p, user)} className="h-8 w-8">
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">View Receipt</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No payments recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
