'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
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
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
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
