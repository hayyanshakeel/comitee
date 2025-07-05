
'use client';

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuthGuard({ role: 'admin' });

  if (loading) {
     return (
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
          <Skeleton className="h-8 w-1/4" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <DashboardSidebar role="admin" />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <DashboardHeader role="admin"/>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
