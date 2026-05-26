'use client'
import { useSession, signOut } from 'next-auth/react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-[8px] overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-line">
        <span className="inline-block w-0.5 h-3.5 bg-accent rounded-full mr-1" />
        <h2 className="text-[13.5px] font-medium text-ink">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function KVRow({ label, value, action }: { label: string; value?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-2.5 border-b border-line last:border-0 items-center" style={{ gridTemplateColumns: '140px 1fr auto' }}>
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="text-[13px] text-ink">{value ?? '-'}</div>
      <div>{action}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session as any)?.role ?? '-'
  const name = session?.user?.name ?? '-'
  const email = session?.user?.email ?? '-'
  const initials = name !== '-' ? name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() : email[0]?.toUpperCase()

  return (
    <div className="p-8" style={{ maxWidth: 680 }}>
      <div className="mb-6">
        <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Settings</div>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Preferences</h1>
      </div>

      {/* Account */}
      <Section title="Account">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-line">
          <div
            className="flex items-center justify-center text-[18px] font-medium text-white rounded-full shrink-0"
            style={{ width: 52, height: 52, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[15px] font-medium text-ink">{name}</div>
            <div className="font-mono text-[12px] text-ink-3">{role.toLowerCase()} · quotatain</div>
          </div>
        </div>
        <KVRow label="Full name" value={name} />
        <KVRow label="Email" value={<span className="font-mono text-[12.5px]">{email}</span>} />
        <KVRow label="Role" value={
          <span className="text-[12px] font-medium px-2 py-0.5 rounded bg-accent-soft text-accent">{role}</span>
        } />
        <KVRow label="Region" value="India (MVP)" />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <KVRow
          label="Density"
          value="Comfortable"
          action={
            <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-[7px]">
              {['Comfortable', 'Compact'].map((d, i) => (
                <button key={d} className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors ${i === 0 ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]' : 'text-ink-2'}`}>{d}</button>
              ))}
            </div>
          }
        />
        <KVRow
          label="Agent verbosity"
          value="Medium"
          action={
            <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-[7px]">
              {['Light', 'Medium', 'Heavy'].map((v, i) => (
                <button key={v} className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors ${i === 1 ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]' : 'text-ink-2'}`}>{v}</button>
              ))}
            </div>
          }
        />
        <KVRow
          label="Theme"
          value={<span className="text-ink-2">Light only <span className="text-[10.5px] font-medium px-1.5 py-0.5 bg-surface-2 text-ink-3 rounded ml-1.5">V2</span></span>}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {[
          'Run completed',
          'High-fit company found',
          'Buying signal detected',
          'Team member activity',
        ].map(item => (
          <div key={item} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
            <span className="text-[13px] text-ink-2">{item}</span>
            <div className="flex items-center gap-4">
              {['Email', 'In-app'].map(ch => (
                <label key={ch} className="flex items-center gap-1.5 text-[12px] text-ink-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-accent" />
                  {ch}
                </label>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* Security */}
      <Section title="Security">
        <KVRow label="Password" value="Last changed: unknown" action={
          <button className="text-[12.5px] text-ink-2 hover:text-ink border border-line px-3 py-1.5 rounded-[6px] transition-colors">Change</button>
        } />
        <KVRow label="Active sessions" value="1 session" action={
          <button className="text-[12.5px] text-ink-2 hover:text-ink border border-line px-3 py-1.5 rounded-[6px] transition-colors">View</button>
        } />
        <KVRow label="API token" value="Not generated" action={
          <button className="text-[12.5px] text-ink-2 hover:text-ink border border-line px-3 py-1.5 rounded-[6px] transition-colors">Generate</button>
        } />
      </Section>

      {/* Sign out */}
      <div className="bg-surface border border-line rounded-[8px] px-5 py-4 flex items-center justify-between mb-4">
        <div>
          <div className="text-[13.5px] font-medium text-ink">Sign out</div>
          <div className="text-[12.5px] text-ink-3 mt-0.5">Sign out of this device only</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-[13px] text-ink-2 hover:text-ink border border-line-2 px-4 py-2 rounded-[6px] transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Danger */}
      <div className="bg-negative-soft border border-negative-soft rounded-[8px] px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-[13.5px] font-medium text-negative">Delete account</div>
          <div className="text-[12.5px] text-negative/70 mt-0.5">Permanently remove your account and all data</div>
        </div>
        <button className="text-[13px] text-negative border border-negative/20 px-4 py-2 rounded-[6px] hover:bg-negative hover:text-white transition-colors">
          Delete
        </button>
      </div>
    </div>
  )
}
