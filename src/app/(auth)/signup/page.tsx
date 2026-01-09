'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignupForm } from '@/components/auth/SignupForm'
import { usePasswordGate } from '@/lib/hooks/usePasswordGate'

export default function SignupPage() {
  const { isUnlocked, isChecking } = usePasswordGate()
  const router = useRouter()

  useEffect(() => {
    if (!isChecking && !isUnlocked) {
      // Redirect to gate if password not verified
      router.push('/gate')
    }
  }, [isUnlocked, isChecking, router])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    )
  }

  if (!isUnlocked) {
    return null // Will redirect
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignupForm />
    </div>
  )
}
