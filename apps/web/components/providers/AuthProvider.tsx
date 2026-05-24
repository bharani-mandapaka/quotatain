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
    // When we go from no-token → token (session just loaded), re-run any
    // queries that fired before auth was ready (e.g. on fresh page load).
    if (token && !prevToken.current) {
      qc.invalidateQueries()
    }
    prevToken.current = token
  }, [session?.accessToken, qc])

  return <>{children}</>
}
