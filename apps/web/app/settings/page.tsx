'use client'
import { useSession, signOut } from 'next-auth/react'

export default function SettingsPage() {
  const { data: session } = useSession()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="text-gray-900 font-medium">{session?.user?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900 font-medium">{session?.user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-900 font-medium">{session?.role ?? '—'}</span>
          </div>
        </div>
      </section>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-sm text-red-600 hover:text-red-700 font-medium"
      >
        Sign out
      </button>
    </div>
  )
}
