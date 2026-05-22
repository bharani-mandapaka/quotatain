import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        })

        if (!res.ok) return null

        const data = await res.json() as {
          token: string
          user: { id: string; email: string; name: string | null; role: string; workspaceId: string }
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          accessToken: data.token,
          workspaceId: data.user.workspaceId,
          role: data.user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: user object comes from authorize()
      if (user) {
        token.accessToken = (user as any).accessToken
        token.userId = user.id
        token.workspaceId = (user as any).workspaceId
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.userId = token.userId as string
      session.workspaceId = token.workspaceId as string
      session.role = token.role as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
