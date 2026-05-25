interface Dim {
  label: string
  score: number
}

interface Props {
  score: number
  dims?: Dim[]
  size?: number
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number
) {
  const p1 = polar(cx, cy, innerR, startDeg)
  const p2 = polar(cx, cy, outerR, startDeg)
  const p3 = polar(cx, cy, outerR, endDeg)
  const p4 = polar(cx, cy, innerR, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

const DEFAULT_DIMS: Dim[] = [
  { label: 'Industry',   score: 80 },
  { label: 'Size',       score: 70 },
  { label: 'Tech',       score: 75 },
  { label: 'Pain Pt',    score: 65 },
  { label: 'Signal',     score: 85 },
  { label: 'Engage',     score: 60 },
]

export function FitmentWheel({ score, dims, size = 170 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const innerR = size * 0.20
  const maxR   = size * 0.44
  const labelR = maxR + size * 0.10
  const activeDims = (dims && dims.length === 6) ? dims : DEFAULT_DIMS

  // guide circles at 25 / 50 / 75 / 100 %
  const guides = [0.25, 0.5, 0.75, 1].map(f => innerR + (maxR - innerR) * f)

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Guide circles */}
        {guides.map((r, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth={0.75}
            strokeDasharray={i < 3 ? '3 3' : undefined}
          />
        ))}

        {/* Wedges */}
        {activeDims.map((dim, i) => {
          const center = i * 60
          const start  = center - 27.9
          const end    = center + 27.9
          const len    = innerR + (maxR - innerR) * (dim.score / 100)
          const fill =
            dim.score >= 70 ? '#D85A28' :
            dim.score >= 40 ? '#E6A36C' :
                              '#D9D2C7'
          const opacity = 0.25 + 0.55 * (dim.score / 100)
          return (
            <path
              key={i}
              d={wedgePath(cx, cy, innerR, len, start, end)}
              fill={fill}
              opacity={opacity}
            />
          )
        })}

        {/* Axis labels */}
        {activeDims.map((dim, i) => {
          const angle = i * 60
          const lp = polar(cx, cy, labelR, angle)
          const anchor =
            Math.abs(angle % 360 - 180) < 10 || Math.abs(angle % 360) < 10
              ? 'middle'
              : (lp.x > cx + 2 ? 'start' : lp.x < cx - 2 ? 'end' : 'middle')
          return (
            <g key={`label-${i}`}>
              <text
                x={lp.x} y={lp.y - 6}
                textAnchor={anchor}
                fontSize={size * 0.059}
                fontFamily="var(--font-mono)"
                fill="var(--ink-3)"
                style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {dim.label}
              </text>
              <text
                x={lp.x} y={lp.y + 7}
                textAnchor={anchor}
                fontSize={size * 0.065}
                fontFamily="var(--font-mono)"
                fontWeight={500}
                fill="var(--ink)"
              >
                {dim.score}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Centre score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-mono font-medium leading-none text-ink"
          style={{ fontSize: size * 0.235, letterSpacing: '-0.04em' }}
        >
          {score}
        </span>
        <span
          className="text-ink-3 uppercase tracking-widest font-medium"
          style={{ fontSize: size * 0.062, marginTop: 2 }}
        >
          fitment
        </span>
      </div>
    </div>
  )
}
