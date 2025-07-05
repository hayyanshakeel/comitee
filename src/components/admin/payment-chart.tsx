
 "use client"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';

interface PaymentChartProps {
  data: { month: string; paid: number; pending: number }[];
  isLoading: boolean;
}

export function PaymentChart({ data, isLoading }: PaymentChartProps) {
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-3/5 rounded-md" />
                <Skeleton className="h-4 w-4/5 mt-2 rounded-md" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[350px] w-full" />
            </CardContent>
        </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Payments Overview</CardTitle>
        <CardDescription>Visual representation of paid vs. pending payments each month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            <Bar dataKey="paid" fill="hsl(var(--primary))" name="Paid" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="hsl(var(--accent))" name="Pending" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
