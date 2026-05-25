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

const ROLE_DESC: Record<Role, string> = {
  AE: 'Runs research, views intelligence cards, exports data',
  SDR: 'Runs research, views intelligence cards',
  HEAD_OF_SALES: 'Full access except user management',
  ADMIN: 'Full access including user management and settings',
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: 'bg-accent-soft text-accent',
    HEAD_OF_SALES: 'bg-positive-soft text-positive',
    AE: 'bg-surface-2 text-ink-2',
    SDR: 'border border-line-2 text-ink-3',
  }
  const label = ROLE_LABEL[role as Role] ?? role
  const cls = styles[role] ?? 'bg-surface-2 text-ink-3'
  return (
    <span className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-[5px] ${cls}`}>
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
    onError: (err: Error) => setFormError(err.message),
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
      <div className="p-8" style={{ maxWidth: 680 }}>
        <div className="flex items-center gap-3 text-negative bg-negative-soft rounded-[8px] px-5 py-4 border border-negative/20">
          <AlertCircle size={16} />
          <p className="text-[13px] font-medium">Only admins can manage users.</p>
        </div>
      </div>
    )
  }

  const users: any[] = data?.users ?? []
  const adminCount = users.filter(u => u.role === 'ADMIN').length
  const hosCount = users.filter(u => u.role === 'HEAD_OF_SALES').length
  const aeSDRCount = users.filter(u => u.role === 'AE' || u.role === 'SDR').length

  return (
    <div className="p-8" style={{ maxWidth: 860 }}>
      {/* Page head */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Settings</div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">Members</h1>
          <div className="text-[13px] text-ink-2 mt-1">Manage who has access to your workspace</div>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-accent text-white px-3.5 py-2 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={14} />
            Add member
          </button>
        )}
      </div>

      {/* Metrics strip */}
      {users.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Admins', value: adminCount },
            { label: 'Head of Sales', value: hosCount },
            { label: 'AEs & SDRs', value: aeSDRCount },
            { label: 'Total seats', value: users.length },
          ].map(m => (
            <div key={m.label} className="bg-surface border border-line rounded-[8px] px-4 py-3">
              <div className="font-mono text-[22px] font-medium text-ink leading-none">{m.value}</div>
              <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.05em] mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add member form */}
      {showAdd && (
        <div className="bg-surface border border-accent-line rounded-[8px] p-6 mb-6">
          <h3 className="text-[15px] font-medium text-ink mb-4">Add member</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-2">Full name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-2">Work email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@company.com"
                className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-2">Temporary password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-2">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
          </div>
          {formError && (
            <p className="text-[12.5px] text-negative mb-3">{formError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => addUser.mutate()}
              disabled={!form.name || !form.email || !form.password || addUser.isPending}
              className="bg-accent text-white px-5 py-2 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 disabled:opacity-40 transition-colors"
            >
              {addUser.isPending ? 'Creating…' : 'Create member'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setFormError('') }}
              className="text-[13px] text-ink-3 hover:text-ink px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={22} className="animate-spin text-ink-4" />
        </div>
      ) : error ? (
        <div className="text-[13px] text-negative bg-negative-soft px-5 py-4 rounded-[8px] border border-negative/20">
          Failed to load members. Please refresh.
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-[8px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg">
                {['Member', 'Role', 'Joined', ''].map(h => (
                  <th key={h} className="text-left text-[11.5px] font-medium text-ink-3 uppercase tracking-[0.05em] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user: any) => {
                const isSelf = user.id === currentUserId
                const ini = initials(user.name, user.email)
                return (
                  <tr key={user.id} className="hover:bg-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full text-[12px] font-medium text-white flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}
                        >
                          {ini}
                        </div>
                        <div>
                          <div className="text-[13.5px] font-medium text-ink">
                            {user.name ?? <span className="text-ink-4 italic">No name</span>}
                          </div>
                          <div className="font-mono text-[11.5px] text-ink-3">{user.email}</div>
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
                          className="text-[12px] border border-line-2 rounded-[5px] px-2 py-1 focus:outline-none focus:border-ink-3 bg-surface text-ink-2 disabled:opacity-50"
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ink-3">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {isSelf ? (
                        <span className="text-[12px] text-ink-4 italic">You</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${user.name ?? user.email} from this workspace?`)) {
                              removeUser.mutate(user.id)
                            }
                          }}
                          disabled={removeUser.isPending}
                          className="p-1.5 text-ink-4 hover:text-negative hover:bg-negative-soft rounded-[6px] transition-colors disabled:opacity-40"
                          title="Remove member"
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
          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-ink-4">
              <UserCircle2 size={36} className="mb-3 opacity-30" />
              <p className="text-[14px] font-medium text-ink-3">No members yet</p>
              <p className="text-[12.5px] text-ink-4 mt-1">Click "Add member" to invite the first teammate</p>
            </div>
          )}
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-4 gap-3 mt-6">
        {ROLES.map(r => (
          <div key={r} className="bg-surface border border-line rounded-[8px] px-4 py-3">
            <RoleBadge role={r} />
            <p className="text-[11.5px] text-ink-3 mt-2 leading-snug">{ROLE_DESC[r]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
