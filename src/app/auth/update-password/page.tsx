'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user came from password reset email
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      } else {
        toast.error('Invalid or expired password reset link')
        setTimeout(() => router.push('/reset-password'), 2000)
      }
    }
    checkSession()
  }, [supabase, router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        setLoading(false)
        return
      }

      // Validate password length
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Password updated successfully!')

      // Sign out and redirect to login
      await supabase.auth.signOut()
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Verifying password reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Update Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdatePassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                At least 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
