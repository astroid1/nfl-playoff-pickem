'use client'

import { useEffect, useState } from 'react'

const GATE_PASSWORD = 'pigskin' // Case insensitive
const STORAGE_KEY = 'nfl_pickem_gate_pass'

export function usePasswordGate() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if password was previously entered
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      setIsUnlocked(true)
    }
    setIsChecking(false)
  }, [])

  const verifyPassword = (password: string): boolean => {
    const isValid = password.toLowerCase() === GATE_PASSWORD.toLowerCase()
    if (isValid) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setIsUnlocked(true)
    }
    return isValid
  }

  const clearPassword = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setIsUnlocked(false)
  }

  return {
    isUnlocked,
    isChecking,
    verifyPassword,
    clearPassword,
  }
}
