import type { DefaultSession, DefaultJWT } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken: string
    userId: string
    workspaceId: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    accessToken?: string
    userId?: string
    workspaceId?: string
    role?: string
  }
}
