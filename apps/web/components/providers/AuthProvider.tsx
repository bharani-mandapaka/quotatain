'use client'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { setApiToken } from '@/lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  useEffect(() => {
    setApiToken(session?.accessToken ?? '')
  }, [session?.accessToken])

  return <>{children}</>
}
