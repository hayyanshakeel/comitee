
'use client'

import Link from "next/link"
import {
  Home,
  Users,
  ReceiptText,
  PanelLeft,
  PiggyBank,
  History,
  Settings
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"

type DashboardHeaderProps = {
  role: 'user' | 'admin';
}

export function DashboardHeader({ role }: DashboardHeaderProps) {
  const isAdmin = role === 'admin';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-base font-medium">
            <Link
              href="#"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <PiggyBank className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">UqbaTrack</span>
            </Link>
            {isAdmin ? (
               <>
                <Link href="/admin/dashboard" className="flex items-center gap-4 px-2.5 text-foreground">
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link href="/admin/users" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Users className="h-5 w-5" />
                  Users
                </Link>
                <Link href="/admin/expenditure" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <ReceiptText className="h-5 w-5" />
                  Expenditure
                </Link>
                 <Link href="/admin/settings" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </>
            ) : (
              <>
                 <Link href="/dashboard" className="flex items-center gap-4 px-2.5 text-foreground">
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <History className="h-5 w-5" />
                  Payment History
                </Link>
                <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
      
      <div className="flex-1">
        <h1 className="text-xl font-semibold font-headline tracking-tight">{isAdmin ? "Admin Dashboard" : "User Dashboard"}</h1>
      </div>

      <UserNav />
    </header>
  )
}
