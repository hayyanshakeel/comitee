
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export function SettingsForm() {
  const [amount, setAmount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [isSaved, setIsSaved] = React.useState(false);

  React.useEffect(() => {
      const fetchSettings = async () => {
          try {
            const settingsDocRef = doc(db, "settings", "billing");
            const settingsDoc = await getDoc(settingsDocRef);
            if(settingsDoc.exists()){
                setAmount(settingsDoc.data().monthlyBillingAmount);
            }
          } catch (error) {
            console.error("Error fetching settings: ", error);
          } finally {
            setLoading(false);
          }
      }
      fetchSettings();
  }, [])

  const handleSave = async () => {
    try {
        await setDoc(doc(db, "settings", "billing"), { monthlyBillingAmount: amount });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
        console.error("Error saving settings: ", error);
    }
  };
  
  if(loading){
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Billing Settings</CardTitle>
                  <CardDescription>
                  Update the standard monthly billing amount for all users. This change will apply to the next billing cycle.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="billing-amount">Monthly Amount (₹)</Label>
                        <Skeleton className="h-10 w-full md:w-1/2 rounded-md" />
                      </div>
                      <Skeleton className="h-10 w-32 rounded-md" />
                  </div>
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
        <CardDescription>
          Update the standard monthly billing amount for all users. This change will apply to the next billing cycle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing-amount">Monthly Amount (₹)</Label>
            <Input
              id="billing-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full md:w-1/2"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleSave}>Save Changes</Button>
            {isSaved && <span className="text-sm text-green-600">Settings saved successfully!</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
