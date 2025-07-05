
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Users, Settings, LogOut, HelpingHand, Receipt } from 'lucide-react';
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
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTitle } from '@radix-ui/react-dialog';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const adminName = "Admin";
  const adminInitials = "A";

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'sheikhhayyaan@gmail.com') {
        setUser(user);
        setLoading(false);
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
  
  if (!isClient || loading) {
     return (
        <div className="flex min-h-svh w-full bg-background">
            <div className="hidden md:block w-14 border-r p-2"><Skeleton className="h-full w-full" /></div>
            <div className="flex-1 flex flex-col">
                <header className="flex items-center justify-between p-4 border-b h-16">
                    <div className="flex items-center gap-4 md:hidden">
                        <Skeleton className="h-8 w-8" />
                        <span className="font-semibold">UQBA Welfare Hub</span>
                    </div>
                     <div className="flex flex-1 items-center justify-end">
                        <Skeleton className="h-9 w-9 rounded-full" />
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background/95">
                    <div className="flex flex-col gap-8">
                        <Skeleton className="h-8 w-48 rounded-md" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Skeleton className="h-28 rounded-lg" />
                            <Skeleton className="h-28 rounded-lg" />
                            <Skeleton className="h-28 rounded-lg" />
                            <Skeleton className="h-28 rounded-lg" />
                        </div>
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-7">
                            <Skeleton className="lg:col-span-4 h-96 rounded-lg" />
                            <Skeleton className="lg:col-span-3 h-96 rounded-lg" />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={false}>
       <Dialog>
        <DialogTitle className="sr-only">Admin Navigation</DialogTitle>
        <Sidebar collapsible="icon">
            <div className="flex h-16 items-center justify-center p-2">
                <Link href="/admin/dashboard">
                    <HelpingHand className="w-8 h-8 text-accent" />
                </Link>
            </div>
            <SidebarContent className="p-2">
            <SidebarMenu>
                <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                    <Link href="/admin/dashboard">
                    <LayoutDashboard />
                    <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="User Management">
                    <Link href="/admin/users">
                    <Users />
                    <span className="group-data-[state=collapsed]:hidden">User Management</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Expenditure">
                    <Link href="/admin/expenditure">
                    <Receipt />
                    <span className="group-data-[state=collapsed]:hidden">Expenditure</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                    <Link href="/admin/settings">
                    <Settings />
                    <span className="group-data-[state=collapsed]:hidden">Settings</span>
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
      </Dialog>
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b h-16">
            <div className="flex items-center gap-4 md:hidden">
                <SidebarTrigger />
                <span className="font-semibold">UQBA Welfare Hub</span>
            </div>
            <div className="flex flex-1 items-center justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{adminInitials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{adminName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/admin/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background/95">
            {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
