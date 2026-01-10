'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    setOpen(false)
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/picks', label: 'Make Picks' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/pool-picks', label: 'Pool Picks' },
    { href: '/account', label: 'Account' },
  ]

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold">
              🏈 Alex's Pigskin Picks
            </Link>
            {user && (
              <nav className="hidden md:flex space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === item.href
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Desktop sign out button */}
                <Button variant="outline" onClick={handleSignOut} className="hidden md:inline-flex">
                  Sign Out
                </Button>
                {/* Mobile menu */}
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] px-6">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col mt-8">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`text-lg font-medium transition-colors hover:text-primary py-4 border-b ${
                            pathname === item.href
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                      <div className="pt-6">
                        <Button variant="outline" onClick={handleSignOut} className="w-full">
                          Sign Out
                        </Button>
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
