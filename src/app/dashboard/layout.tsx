'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { LayoutDashboard, LogOut, HelpingHand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth, db } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email === 'sheikhhayyaan@gmail.com') {
          router.push('/admin/dashboard');
          return;
        }
        setUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUserData({ id: docSnap.id, ...docSnap.data() } as User);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const userName = userData?.name ?? 'User';
  const userInitials = userName.split(' ').map((n) => n[0]).join('');

  if (loading) {
    return (
        <div className="flex min-h-svh w-full bg-background">
            <div className="hidden md:block w-14 border-r p-2"><Skeleton className="h-full w-full" /></div>
            <div className="flex-1">
                <header className="flex items-center justify-between p-4 border-b md:justify-end">
                    <span className="font-semibold md:hidden">UQBA Welfare Hub</span>
                    <Skeleton className="h-9 w-9 rounded-full" />
                </header>
                <main className="p-8">
                    <Skeleton className="h-screen w-full" />
                </main>
            </div>
        </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <div className="flex h-16 items-center justify-center p-2 group-data-[state=expanded]:justify-between group-data-[state=expanded]:p-4">
            <Link href="/dashboard" className="flex items-center gap-2 group-data-[state=collapsed]:hidden">
                <HelpingHand className="w-8 h-8 text-accent" />
                <span className="text-xl font-bold font-headline">UQBA Hub</span>
            </Link>
            <Link href="/dashboard" className="group-data-[state=expanded]:hidden">
                <HelpingHand className="w-8 h-8 text-accent" />
            </Link>
        </div>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                        <LogOut />
                        <span className="group-data-[state=collapsed]:hidden">Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b md:justify-end">
            <span className="font-semibold md:hidden">UQBA Welfare Hub</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">{children}</main>
      </div>
    </SidebarProvider>
  );
}
