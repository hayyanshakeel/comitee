'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { PaymentSettings } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, IndianRupee, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Schema now only includes settings managed in the DB
const settingsSchema = z.object({
  monthlyFee: z.coerce.number().min(1, 'Monthly fee must be at least 1.'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { monthlyFee: 0 },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!db) return;
      setLoading(true);
      try {
        const settingsDocRef = doc(db, 'app_settings', 'payment');
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
          // We only care about monthlyFee from the DB now
          const fetchedData = settingsDoc.data() as PaymentSettings;
          form.reset({ monthlyFee: fetchedData.monthlyFee });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load application settings.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!db) return;
    setIsSubmitting(true);
    try {
      const settingsDocRef = doc(db, 'app_settings', 'payment');
      // We only set the monthlyFee field
      await setDoc(settingsDocRef, { monthlyFee: values.monthlyFee }, { merge: true });
      toast({
        title: 'Settings Saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save settings. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
    )
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-2xl mb-6">
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Manage general settings for the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="monthlyFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Membership Fee</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" className="pl-8" placeholder="e.g., 500" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Card className="max-w-2xl border-amber-500">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Razorpay Integration for Vercel
            </CardTitle>
            <CardDescription>
                To enable online payments and webhooks, you must securely set your Razorpay keys as Environment Variables in your Vercel project settings.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <p>The following environment variables need to be configured in Vercel:</p>
            <ul className="list-disc pl-5 space-y-2 font-mono text-xs bg-muted p-4 rounded-md">
                <li><span className="font-semibold">RAZORPAY_KEY_ID</span>: Your Razorpay Live Key ID.</li>
                <li><span className="font-semibold">RAZORPAY_KEY_SECRET</span>: Your Razorpay Live Key Secret.</li>
                <li><span className="font-semibold">RAZORPAY_WEBHOOK_SECRET</span>: Your secure secret for verifying webhook requests.</li>
            </ul>
            <p>Storing these keys as environment variables is the secure, industry-standard method for platforms like Vercel.</p>
        </CardContent>
      </Card>
    </>
  );
}
