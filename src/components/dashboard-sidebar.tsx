
'use client'

import Link from 'next/link'
import { Home, Users, Settings, PiggyBank, ReceiptText } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type DashboardSidebarProps = {
  role: 'user' | 'admin'
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  const userLinks = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
  ]

  const adminLinks = [
    { href: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/expenditure', icon: ReceiptText, label: 'Expenditure' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  const links = isAdmin ? adminLinks : userLinks

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex">
      <TooltipProvider>
        <nav className="flex flex-1 flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="#"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <PiggyBank className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">UqbaTrack</span>
          </Link>
          {links.map((link) => (
            <Tooltip key={link.href}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                     (pathname === link.href || (link.href !== '/admin/dashboard' && link.href !== '/dashboard' && pathname.startsWith(link.href))) ? 'bg-accent text-accent-foreground' : ''
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="sr-only">{link.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  )
}
