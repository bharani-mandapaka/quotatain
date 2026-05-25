'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Plus, Trash2, ShieldCheck, UserCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

const ROLES = ['AE', 'SDR', 'HEAD_OF_SALES', 'ADMIN'] as const
type Role = typeof ROLES[number]

const ROLE_LABEL: Record<Role, string> = {
  AE: 'Account Executive',
  SDR: 'Sales Dev Rep',
  HEAD_OF_SALES: 'Head of Sales',
  ADMIN: 'Admin',
}

const ROLE_COLOR: Record<Role, string> = {
  AE: 'bg-blue-50 text-blue-700',
  SDR: 'bg-gray-100 text-gray-700',
  HEAD_OF_SALES: 'bg-purple-50 text-purple-700',
  ADMIN: 'bg-indigo-50 text-indigo-700',
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLOR[role as Role] ?? 'bg-gray-100 text-gray-600'
  const label = ROLE_LABEL[role as Role] ?? role
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {role === 'ADMIN' && <ShieldCheck size={11} />}
      {label}
    </span>
  )
}

function initials(name: string | null, email: string) {
  if (name) return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return email[0].toUpperCase()
}

export default function UsersPage() {
  const { data: session } = useSession()
  const isAdmin = (session as any)?.role === 'ADMIN'
  const currentUserId = (session as any)?.userId

  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AE' as Role })
  const [formError, setFormError] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace-users'],
    queryFn: api.workspace.users.list,
    enabled: isAdmin,
  })

  const addUser = useMutation({
    mutationFn: () => api.workspace.users.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-users'] })
      setForm({ name: '', email: '', password: '', role: 'AE' })
      setShowAdd(false)
      setFormError('')
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.workspace.users.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-users'] }),
  })

  const removeUser = useMutation({
    mutationFn: (id: string) => api.workspace.users.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-users'] }),
  })

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 rounded-xl p-5 border border-red-200">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">Only admins can manage users.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage who has access to your workspace</p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            Add User
          </button>
        )}
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="bg-white border border-indigo-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New User</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@company.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
          </div>
          {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => addUser.mutate()}
              disabled={!form.name || !form.email || !form.password || addUser.isPending}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {addUser.isPending ? 'Creating…' : 'Create User'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setFormError('') }}
              className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
          Failed to load users. Please refresh.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.users.map((user: any) => {
                const isSelf = user.id === currentUserId
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(user.name, user.email)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name ?? <span className="text-gray-400 italic">No name</span>}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {isSelf ? (
                        <RoleBadge role={user.role} />
                      ) : (
                        <select
                          value={user.role}
                          onChange={e => changeRole.mutate({ id: user.id, role: e.target.value })}
                          disabled={changeRole.isPending}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 disabled:opacity-50"
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic">You</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${user.name ?? user.email} from this workspace?`)) {
                              removeUser.mutate(user.id)
                            }
                          }}
                          disabled={removeUser.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Remove user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data?.users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <UserCircle2 size={36} className="mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-500">No users yet</p>
              <p className="text-xs mt-1">Click "Add User" to create the first team member</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
