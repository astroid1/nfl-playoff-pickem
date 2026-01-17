'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { usePasswordGate } from '@/lib/hooks/usePasswordGate'
import { createClient } from '@/lib/supabase/client'

export function PasswordGate() {
  const [gatePassword, setGatePassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const { verifyPassword } = usePasswordGate()
  const router = useRouter()

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const supabase = createClient()

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)

    // Simulate slight delay for UX
    await new Promise(resolve => setTimeout(resolve, 300))

    if (verifyPassword(gatePassword)) {
      toast.success('Access granted!')
      router.push('/signup')
    } else {
      toast.error('Incorrect password. Please try again.')
    }

    setIsVerifying(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data.user) {
        // Password gate not needed for existing users
        toast.success('Welcome back!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">🏈 Alex's Pigskin Picks</h1>
        </div>

        {/* Tabs for New Users vs Existing Users */}
        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Sign In</TabsTrigger>
            <TabsTrigger value="new">New User</TabsTrigger>
          </TabsList>

          {/* Existing User - Login */}
          <TabsContent value="existing">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoggingIn}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoggingIn}
                      minLength={6}
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? 'Signing in...' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* New User - Password Gate */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>Enter Access Code</CardTitle>
              </CardHeader>
              <form onSubmit={handleGateSubmit}>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="gate-password">Access Code</Label>
                    <Input
                      id="gate-password"
                      type="password"
                      placeholder="Enter access code"
                      value={gatePassword}
                      onChange={(e) => setGatePassword(e.target.value)}
                      required
                      disabled={isVerifying}
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" className="w-full" disabled={isVerifying}>
                    {isVerifying ? 'Verifying...' : 'Continue to Sign Up'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
