
'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, setDoc, doc, deleteDoc, collectionGroup, query, getDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth"
import { initializeApp, getApps } from "firebase/app"
import { db } from "@/lib/firebase"
import type { AdminUserView, Payment } from "@/lib/types"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Download, MoreHorizontal, PlusCircle, Loader2, Trash2, CreditCard } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const createUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const formatToINR = (amount: number) => {
    return `INR ${amount.toLocaleString('en-IN')}`;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [paymentsByUserId, setPaymentsByUserId] = useState<Map<string, Payment[]>>(new Map());
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreateUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);
  const { toast } = useToast();

  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  
  const fetchUsersAndSettings = async () => {
    setLoading(true);
    try {
      if (!db) return;

      // Fetch settings, users and payments in parallel
      const settingsDocPromise = getDoc(doc(db, 'app_settings', 'payment'));
      const usersSnapshotPromise = getDocs(collection(db, "users"));
      const paymentsSnapshotPromise = getDocs(query(collectionGroup(db, 'payments')));

      const [settingsDoc, userSnapshot, allPaymentsSnapshot] = await Promise.all([
        settingsDocPromise,
        usersSnapshotPromise,
        paymentsSnapshotPromise
      ]);

      const fetchedMonthlyFee = settingsDoc.exists() ? settingsDoc.data().monthlyFee : 500;
      setMonthlyFee(fetchedMonthlyFee);

      const localPaymentsByUserId = new Map<string, Payment[]>();
      allPaymentsSnapshot.forEach(doc => {
          const payment = { id: doc.id, ...doc.data() } as Payment;
          const userId = doc.ref.parent.parent?.id;
          if (userId) {
              if (!localPaymentsByUserId.has(userId)) {
                  localPaymentsByUserId.set(userId, []);
              }
              localPaymentsByUserId.get(userId)?.push(payment);
          }
      });
      setPaymentsByUserId(localPaymentsByUserId);
      
      const userList = userSnapshot.docs
          .map(doc => {
              const data = doc.data();
              const userPayments = localPaymentsByUserId.get(doc.id) || [];
              const paidMonths = userPayments.length;
              return {
                  id: doc.id,
                  name: data.name,
                  email: data.email,
                  paidMonths: paidMonths,
                  totalMonths: 12,
                  status: paidMonths > 0 ? "Active" : "Pending",
                  role: data.role,
                  createdAt: data.createdAt,
              } as AdminUserView & { role?: string }
          })
          .filter(user => user.role !== 'admin');
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch user data." });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchUsersAndSettings();
  }, [toast]);


  const handleExportCSV = () => {
    if (!users.length) {
        toast({ variant: "destructive", title: "No users to export." });
        return;
    }
    const headers = ["ID", "Name", "Email", "Status", "Paid Amount", "Pending Amount", "With Effect From", "Up To"];
    const csvRows = [
        headers.join(','),
        ...users.map(user => {
            const userPayments = paymentsByUserId.get(user.id) || [];
            const { paidAmount, pendingAmount } = calculateFinancials(user, monthlyFee, userPayments);

            let withEffectFrom = "";
            let upTo = "";

            if (userPayments.length > 0) {
              const sortedPayments = [...userPayments].sort((a, b) => {
                const dateA = new Date(a.year, MONTHS.indexOf(a.month));
                const dateB = new Date(b.year, MONTHS.indexOf(b.month));
                return dateA.getTime() - dateB.getTime();
              });

              const firstPayment = sortedPayments[0];
              const lastPayment = sortedPayments[sortedPayments.length - 1];

              withEffectFrom = `"${firstPayment.month} ${firstPayment.year}"`;
              upTo = `"${lastPayment.month} ${lastPayment.year}"`;
            }

            return [
              user.id, 
              `"${user.name}"`, 
              user.email, 
              user.status, 
              paidAmount, 
              pendingAmount,
              withEffectFrom,
              upTo
            ].join(',');
        })
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'uqbatrack_users.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleCreateUser = async (values: z.infer<typeof createUserSchema>) => {
    if (!db) {
        toast({ variant: "destructive", title: "Firebase Not Configured", description: "Cannot create user." });
        return;
    }
    setIsCreatingUser(true);
    try {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      if (!firebaseConfig.apiKey) throw new Error("Firebase configuration is missing.");
      
      const secondaryAppName = "secondary-auth-app";
      const secondaryApp = getApps().find(app => app.name === secondaryAppName) ?? initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), { 
          uid: user.uid, 
          email: values.email, 
          name: values.name, 
          role: 'user',
          createdAt: new Date().toISOString(),
      });
      
      toast({ title: "User Created", description: "The new user account has been created successfully." });
      setCreateUserDialogOpen(false);
      createUserForm.reset();
      fetchUsersAndSettings(); // Refresh the list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: error.code === 'auth/email-already-in-use' ? 'This email is already registered.' : error.message });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !db) return;
    try {
        await deleteDoc(doc(db, "users", userToDelete.id));
        setUsers(users.filter(u => u.id !== userToDelete.id));
        toast({ title: "User Data Deleted", description: "User profile removed. To fully remove them, delete their account from the Firebase Authentication console." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
    } finally {
        setUserToDelete(null);
    }
  };

  const calculateFinancials = (user: AdminUserView, fee: number, payments: Payment[]) => {
    if (!user.createdAt) {
      return { paidAmount: 0, pendingAmount: 0, progress: 0, dueMonths: 0, paidMonthsThisYear: 0 };
    }
    const creationDate = new Date(user.createdAt);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const creationYear = creationDate.getFullYear();
    const creationMonth = creationDate.getMonth();
    const currentMonth = currentDate.getMonth();

    let dueMonths = 0;
    if (creationYear < currentYear) {
      dueMonths = currentMonth + 1;
    } else if (creationYear === currentYear) {
      dueMonths = currentMonth - creationMonth + 1;
    }
    dueMonths = Math.max(0, dueMonths);

    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsThisYear = payments.filter(p => p.year === currentYear);
    const paidMonthsThisYear = paymentsThisYear.length;
    
    let totalDueMonthsThisYear = 0;
    if (creationYear < currentYear) {
        totalDueMonthsThisYear = currentMonth + 1;
    } else if (creationYear === currentYear) {
        totalDueMonthsThisYear = currentMonth - creationMonth + 1;
    }
    totalDueMonthsThisYear = Math.max(0, totalDueMonthsThisYear);

    const pendingMonths = Math.max(0, totalDueMonthsThisYear - paidMonthsThisYear);
    const pendingAmount = pendingMonths > 0 ? pendingMonths * fee : 0;
    
    const progress = totalDueMonthsThisYear > 0 ? (paidMonthsThisYear / totalDueMonthsThisYear) * 100 : 100;

    return { paidAmount, pendingAmount, progress: Math.min(100, progress), dueMonths: totalDueMonthsThisYear, paidMonthsThisYear };
  };

  if (loading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
            <CardTitle>User Management</CardTitle>
            <CardDescription>
                Create, manage, and view all committee members.
            </CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
            </Button>
            <Dialog open={isCreateUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
                <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create User</span>
                </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                    Fill in the details below to create a new user account.
                    </DialogDescription>
                </DialogHeader>
                <Form {...createUserForm}>
                    <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                      <FormField
                        control={createUserForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="User's full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="user@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                          <Button type="submit" className="w-full sm:w-auto" disabled={isCreatingUser}>
                          {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create User
                          </Button>
                      </DialogFooter>
                    </form>
                </Form>
                </DialogContent>
            </Dialog>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Progress (Current Year)</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {users.length > 0 ? users.map((user) => {
                    const userPayments = paymentsByUserId.get(user.id) || [];
                    const { paidAmount, pendingAmount, progress, dueMonths, paidMonthsThisYear } = calculateFinancials(user, monthlyFee, userPayments);

                    return (
                        <TableRow key={user.id}>
                            <TableCell>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.status === 'Active' ? 'secondary' : 'destructive'} className={user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {user.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatToINR(paidAmount)}</TableCell>
                            <TableCell>{formatToINR(pendingAmount)}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Progress value={progress} aria-label={`${Math.round(progress)}% paid`} />
                                    <span className="text-xs text-muted-foreground">{paidMonthsThisYear}/{dueMonths}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/users/${user.id}`}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Record Payment
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setUserToDelete(user)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                }) : (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No users found.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This will delete the user's data from Firestore. To fully remove them, you must also delete their account from the Firebase Authentication console. This action cannot be undone.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
