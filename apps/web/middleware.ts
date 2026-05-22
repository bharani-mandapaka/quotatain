export { default } from 'next-auth/middleware'

// Protect all routes except /login, Next.js internals, and static files
export const config = {
  matcher: ['/((?!login|signup|api/auth|_next/static|_next/image|favicon\\.ico).*)'],
}
