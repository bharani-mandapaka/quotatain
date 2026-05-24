'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setApiToken } from '@/lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const prevToken = useRef('')

  useEffect(() => {
    const token = session?.accessToken ?? ''
    setApiToken(token)
    // When we go from no-token → token (session just loaded), reset any
    // queries that fired before auth was ready (401 errors on fresh page load).
    // resetQueries clears error state AND triggers an immediate re-fetch for
    // all active observers — unlike invalidateQueries which doesn't clear errors.
    if (token && !prevToken.current) {
      qc.resetQueries()
    }
    prevToken.current = token
  }, [session?.accessToken, qc])

  return <>{children}</>
}
