interface Props {
  score: number
  size?: 'sm' | 'md'
}

export function ScorePill({ score, size = 'md' }: Props) {
  const tone =
    score >= 75 ? { bar: '#2F7D5B', text: '#2F7D5B', bg: '#E5F2EB' } :
    score >= 50 ? { bar: '#8E8881', text: '#5C5751', bg: '#F4F2EE' } :
    score >= 25 ? { bar: '#B07300', text: '#B07300', bg: '#FBF1DD' } :
                  { bar: '#B53A20', text: '#B53A20', bg: '#FBE5DD' }

  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-[3px]'
  const fs  = size === 'sm' ? 'text-[11px]'  : 'text-[12.5px]'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] font-mono font-medium min-w-[52px] ${pad} ${fs}`}
      style={{ background: tone.bg, color: tone.text }}
    >
      <span
        className="rounded-[1px] shrink-0"
        style={{ width: 4, height: 16, background: tone.bar, opacity: 0.7 }}
      />
      {score}
    </span>
  )
}
