'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/context/auth-context'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PiggyBank, Loader2, AlertTriangle } from 'lucide-react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createRazorpayOrder } from '@/app/actions/payment' // ✅ Make sure path is correct

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

type LoginFormValues = z.infer<typeof loginSchema>;

function FirebaseWarning() {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Firebase Not Configured</AlertTitle>
      <AlertDescription>
        <p>Your Firebase credentials are not set up correctly.</p>
        <p className="mt-2">Please create a <strong>.env.local</strong> file and fill in your new project credentials.</p>
        <p className="mt-2">You may need to restart the development server after creating the file.</p>
      </AlertDescription>
    </Alert>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isFirebaseConfigured, setFirebaseConfigured] = useState(true);
  const { refreshUserProfile } = useAuth();

  useEffect(() => {
    if (!auth || !db) {
      setFirebaseConfigured(false);
    }
  }, []);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      if (!isFirebaseConfigured || !auth || !db) {
        toast({
          variant: "destructive",
          title: "Firebase Not Configured",
          description: "Cannot log in until Firebase is configured.",
        });
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userProfile = userDoc.data();
        await refreshUserProfile();

        // ✅ ADD: Test Razorpay order creation
        const razorpayResult = await createRazorpayOrder({
          amount: 500, // Example amount
          month: "July",
          year: 2025,
          userId: user.uid,
          userName: userProfile.name || 'No Name',
          userEmail: user.email || 'no-email@example.com',
        });
        console.log("Razorpay order result:", razorpayResult);

        if (userProfile.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        throw new Error("User profile not found. Please contact an administrator.");
      }
    } catch (error: any) {
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-credential') {
        description = "Invalid email or password. Please try again.";
      } else if (error.message.includes("User profile not found")) {
        description = "User profile not found in the database. An administrator must create your profile before you can log in.";
      } else if (error.code === 'permission-denied' || (error.message && error.message.includes('offline'))) {
        description = "Could not connect to the database. This is likely a Firestore security rule issue.";
      }
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-6">
        <div className="flex items-center gap-2 text-primary">
          <PiggyBank className="h-8 w-8" />
          <h1 className="text-3xl font-bold font-headline">UqbaTrack</h1>
        </div>
        <Card className="w-full">
            <CardHeader>
            <CardTitle className="text-2xl font-headline">Login</CardTitle>
            <CardDescription>Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <CardContent>
            {!isFirebaseConfigured ? (
              <FirebaseWarning />
            ) : (
            <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                        <Input placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                        <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                </Button>
                </form>
            </Form>
            )}
            </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Uqba Committee &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
