
'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, query, collectionGroup, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AdminUserView, Payment } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, ArrowUpRight, IndianRupee, TrendingDown, Wallet } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const formatToINR = (amount: number) => {
    return `INR ${amount.toLocaleString('en-IN')}`;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [paymentsByUserId, setPaymentsByUserId] = useState<Map<string, Payment[]>>(new Map());
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalUsers: 0,
    pendingAmount: 0,
    pendingUsersCount: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalExpenditure: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        if (!db) return;

        // Fetch settings, users, payments and expenditures in parallel
        const settingsDocRef = doc(db, 'app_settings', 'payment');
        const usersCollection = collection(db, "users");
        const paymentsQuery = query(collectionGroup(db, 'payments'));
        const expendituresCollection = collection(db, "expenditures");
        
        const [settingsDoc, userSnapshot, allPaymentsSnapshot, expendituresSnapshot] = await Promise.all([
            getDoc(settingsDocRef),
            getDocs(usersCollection),
            getDocs(paymentsQuery),
            getDocs(expendituresCollection)
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

        const fetchedExpenditures = expendituresSnapshot.docs.map(doc => doc.data().amount);
        const totalExpenditure = fetchedExpenditures.reduce((sum, amount) => sum + amount, 0);

         setStats(prev => ({ ...prev, totalExpenditure }));

      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch dashboard data.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  useEffect(() => {
    if (loading || users.length === 0 || monthlyFee === 0) return;

    let totalCollected = 0;
    let totalPending = 0;
    let pendingUsersCount = 0;

    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();

    users.forEach(user => {
        const userPayments = paymentsByUserId.get(user.id) || [];
        totalCollected += userPayments.reduce((acc, p) => acc + p.amount, 0);

        if (user.createdAt) {
            const creationDate = new Date(user.createdAt);
            const creationYear = creationDate.getFullYear();
            const creationMonthIndex = creationDate.getMonth();

            let dueMonths = 0;
            if (creationYear < currentYear) {
                dueMonths = currentMonthIndex + 1;
            } else if (creationYear === currentYear) {
                dueMonths = currentMonthIndex - creationMonthIndex + 1;
            }
            dueMonths = Math.max(0, dueMonths);
            
            const paymentsThisYear = userPayments.filter(p => p.year === currentYear).length;
            const pendingMonths = dueMonths - paymentsThisYear;

            if (pendingMonths > 0) {
                totalPending += pendingMonths * monthlyFee;
                pendingUsersCount++;
            }
        }
    });

     setStats(prev => ({
        ...prev,
        totalCollected,
        totalUsers: users.length,
        pendingAmount: totalPending,
        pendingUsersCount: pendingUsersCount,
        activeUsers: users.filter(u => u.status === 'Active').length,
        pendingUsers: users.filter(u => u.status !== 'Active').length
    }));

  }, [users, paymentsByUserId, monthlyFee, loading]);

  const financialChartData = [
    { name: "Collected", value: stats.totalCollected, fill: "var(--color-collected)" },
    { name: "Pending", value: stats.pendingAmount, fill: "var(--color-pending)" },
  ];

  const financialChartConfig = {
    value: { label: "Amount (INR)" },
    collected: { label: "Collected", color: "hsl(var(--chart-1))" },
    pending: { label: "Pending", color: "hsl(var(--chart-2))" },
  } as const;
  
  const netBalance = stats.totalCollected - stats.totalExpenditure;

  const pendingPaymentUsers = users.filter(user => {
    const userPayments = paymentsByUserId.get(user.id) || [];
     if (!user.createdAt) return false;

    const creationDate = new Date(user.createdAt);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();

    let dueMonths = 0;
    if (creationDate.getFullYear() < currentYear) {
        dueMonths = currentMonthIndex + 1;
    } else if (creationDate.getFullYear() === currentYear) {
        dueMonths = currentMonthIndex - creationDate.getMonth() + 1;
    }
    dueMonths = Math.max(0, dueMonths);

    const paymentsThisYear = userPayments.filter(p => p.year === currentYear).length;
    return (dueMonths - paymentsThisYear) > 0;
  });

  if (loading) {
    return (
        <div className="flex flex-col gap-4 md:gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="lg:col-span-4 h-96" />
                <Skeleton className="lg:col-span-3 h-96" />
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{netBalance.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Collected minus expenditures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCollected.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">from {stats.totalUsers} users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExpenditure.toLocaleString('en-IN')}</div>
             <p className="text-xs text-muted-foreground">&nbsp;</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAmount.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">from {stats.pendingUsersCount} users</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
            <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Comparison of collected revenue vs. pending dues.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={financialChartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={financialChartData}>
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <YAxis tickFormatter={(value) => `INR ${Number(value) / 1000}k`} />
                        <Tooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => formatToINR(Number(value))} />} />
                        <Bar dataKey="value" radius={8} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users with Pending Payments</CardTitle>
            <CardDescription>
              These users have outstanding payments for one or more months.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {pendingPaymentUsers.length > 0 ? (
                pendingPaymentUsers.slice(0, 5).map(user => {
                  const userPayments = paymentsByUserId.get(user.id) || [];
                   const creationDate = new Date(user.createdAt);
                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear();
                    const currentMonthIndex = currentDate.getMonth();

                    let dueMonths = 0;
                    if (creationDate.getFullYear() < currentYear) {
                        dueMonths = currentMonthIndex + 1;
                    } else if (creationDate.getFullYear() === currentYear) {
                        dueMonths = currentMonthIndex - creationDate.getMonth() + 1;
                    }
                    dueMonths = Math.max(0, dueMonths);
                    
                    const paymentsThisYear = userPayments.filter(p => p.year === currentYear).length;
                    const pendingMonths = dueMonths - paymentsThisYear;

                    return (
                      <div key={user.id} className="flex items-center justify-between gap-4">
                          <Link href={`/admin/users/${user.id}`} className="flex items-center gap-4 group">
                            <Avatar>
                                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium leading-none group-hover:underline">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </Link>
                          <div className="text-right">
                              <p className="text-sm font-medium">
                                  {formatToINR(pendingMonths * monthlyFee)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                  {pendingMonths} months due
                              </p>
                          </div>
                      </div>
                    )
                })
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">All payments are up to date!</p>
            )}
          </CardContent>
          {pendingPaymentUsers.length > 0 && (
            <CardFooter>
              <Button className="w-full" asChild>
                <Link href="/admin/users">
                  View All Users <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </>
  )
}
