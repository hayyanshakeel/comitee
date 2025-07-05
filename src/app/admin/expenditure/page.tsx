
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ExpenditureTable } from '@/components/admin/expenditure-table';
import type { Expenditure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ExpenditurePage() {
    const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const expendituresRef = collection(db, "expenditures");
        const q = query(expendituresRef, orderBy("date", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expendituresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expenditure));
            setExpenditures(expendituresData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenditures:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-8">
              <h1 className="text-3xl font-bold font-headline">Expenditure Management</h1>
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <Skeleton className="h-6 w-32 rounded-md" />
                            <Skeleton className="h-4 w-80 mt-2 rounded-md" />
                        </div>
                        <div className='flex gap-2'>
                          <Skeleton className="h-10 w-28 rounded-md" />
                          <Skeleton className="h-10 w-28 rounded-md" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]"><Skeleton className="h-5 w-24 rounded-md" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-full rounded-md" /></TableHead>
                                <TableHead className="w-[150px]"><Skeleton className="h-5 w-28 rounded-md" /></TableHead>
                                <TableHead className="w-[80px] text-right"><Skeleton className="h-5 w-16 ml-auto rounded-md" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full max-w-lg rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
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
      <h1 className="text-3xl font-bold font-headline">Expenditure Management</h1>
      <ExpenditureTable expenditures={expenditures} />
    </div>
  );
}
