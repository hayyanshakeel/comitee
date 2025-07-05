
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface PaymentCardsProps {
  totalPaid: number;
  totalPending: number;
  isLoading: boolean;
}

export function PaymentCards({ totalPaid, totalPending, isLoading }: PaymentCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        <Skeleton className="h-[92px] rounded-lg" />
        <Skeleton className="h-[92px] rounded-lg" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full dark:bg-green-900/50">
             <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className={`p-3 rounded-full ${totalPending > 0 ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-muted'}`}>
            <AlertTriangle className={`h-6 w-6 ${totalPending > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm text-muted-foreground">Pending Payments</p>
            <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
