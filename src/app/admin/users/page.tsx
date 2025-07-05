
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { UserManagementTable } from '@/components/admin/user-management-table';
import type { User, Payment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let usersLoaded = false;
        let paymentsLoaded = false;

        const updateLoadingState = () => {
            if (usersLoaded && paymentsLoaded) {
                setLoading(false);
            }
        };

        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);
            usersLoaded = true;
            updateLoadingState();
        }, (error) => {
            console.error("Error fetching users:", error);
            usersLoaded = true;
            updateLoadingState();
        });

        const unsubPayments = onSnapshot(collection(db, "payments"), (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(paymentsData);
            paymentsLoaded = true;
            updateLoadingState();
        }, (error) => {
            console.error("Error fetching payments:", error);
            paymentsLoaded = true;
            updateLoadingState();
        });

        return () => {
            unsubUsers();
            unsubPayments();
        };
    }, []);

    if(loading) {
        return (
            <div className="flex flex-col gap-8">
              <h1 className="text-3xl font-bold font-headline">User Management</h1>
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <Skeleton className="h-6 w-20 rounded-md" />
                            <Skeleton className="h-4 w-64 mt-2 rounded-md" />
                        </div>
                        <Skeleton className="h-10 w-28 rounded-md" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-24 rounded-md" /></TableHead>
                                <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-40 rounded-md" /></TableHead>
                                <TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-32 rounded-md" /></TableHead>
                                <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded-md" /></TableHead>
                                <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-28 rounded-md" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto rounded-md" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32 rounded-md" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48 rounded-md" /></TableCell>
                                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32 rounded-md" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            </div>
        )
    }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold font-headline">User Management</h1>
      <UserManagementTable users={users} payments={payments} />
    </div>
  );
}
