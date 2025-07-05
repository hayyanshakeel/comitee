
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Payment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface UsersWithPendingPaymentsTableProps {
  pendingPayments: Payment[];
  isLoading: boolean;
}

export function UsersWithPendingPaymentsTable({ pendingPayments, isLoading }: UsersWithPendingPaymentsTableProps) {
  if (isLoading) {
    return (
       <Card>
            <CardHeader>
                <Skeleton className="h-7 w-3/5 rounded-md" />
                <Skeleton className="h-4 w-4/5 mt-2 rounded-md" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Payments</CardTitle>
        <CardDescription>A list of users with outstanding payments for the current month.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Month</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingPayments.length > 0 ? (
              pendingPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="font-medium">{payment.userName}</div>
                  </TableCell>
                  <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-orange-500 border-orange-500">
                      {payment.month} {payment.year}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No pending payments found for this month.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
