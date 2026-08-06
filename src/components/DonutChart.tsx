interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  size?: number
  centerLabel?: string
  centerValue?: string
}

const GAP = 1.5

function arc(cx: number, cy: number, R: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d - 90) * (Math.PI / 180)
  const x1 = cx + R * Math.cos(toRad(startDeg))
  const y1 = cy + R * Math.sin(toRad(startDeg))
  const x2 = cx + R * Math.cos(toRad(endDeg))
  const y2 = cy + R * Math.sin(toRad(endDeg))
  const ix1 = cx + r * Math.cos(toRad(endDeg))
  const iy1 = cy + r * Math.sin(toRad(endDeg))
  const ix2 = cx + r * Math.cos(toRad(startDeg))
  const iy2 = cy + r * Math.sin(toRad(startDeg))
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${r},${r} 0 ${large},0 ${ix2},${iy2}Z`
}

export default function DonutChart({ segments, size = 200, centerLabel, centerValue }: Props) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.44
  const r = size * 0.28

  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const valid = segments.filter(s => s.value > 0)

  let cursor = 0
  const paths = valid.map(seg => {
    const sweep = (seg.value / total) * 360
    const start = cursor + GAP / 2
    const end = cursor + sweep - GAP / 2
    cursor += sweep
    return { ...seg, start, end }
  })

  const fontSize = size * 0.07
  const subFontSize = size * 0.055

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {total === 0 ? (
        <path d={arc(cx, cy, R, r, 0, 359.99)} fill="var(--surface-2)" />
      ) : (
        paths.map((p, i) => (
          <path key={i} d={arc(cx, cy, R, r, p.start, p.end)} fill={p.color} />
        ))
      )}
      {centerLabel && (
        <text x={cx} y={cy - subFontSize * 0.6} textAnchor="middle" fontSize={subFontSize} fill="var(--text-dim)" fontFamily="inherit">{centerLabel}</text>
      )}
      {centerValue && (
        <text x={cx} y={cy + fontSize * 0.8} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill="var(--text)" fontFamily="inherit">{centerValue}</text>
      )}
    </svg>
  )
}
