
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface OverviewCardsProps {
  totalRaised: number;
  totalPaid: number;
  totalPending: number;
  totalExpenditure: number;
  isLoading: boolean;
}

export function OverviewCards({ totalRaised, totalPaid, totalPending, totalExpenditure, isLoading }: OverviewCardsProps) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[92px] rounded-lg" />
        <Skeleton className="h-[92px] rounded-lg" />
        <Skeleton className="h-[92px] rounded-lg" />
        <Skeleton className="h-[92px] rounded-lg" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Total Raised</p>
                <p className="text-2xl font-bold">₹{totalRaised.toLocaleString()}</p>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</p>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-500 dark:text-orange-400" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-500 dark:text-red-400" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Expenditure</p>
                <p className="text-2xl font-bold">₹{totalExpenditure.toLocaleString()}</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
