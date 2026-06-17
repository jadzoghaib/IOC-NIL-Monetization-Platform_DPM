/**
 * MedalDots — Olympic medal discs with rings embossed, + count labels.
 *
 * Usage:
 *   <MedalDots gold={3} silver={1} bronze={0} />              ← card top-right
 *   <MedalDots gold={3} silver={1} bronze={0} showLabels />   ← profile hero
 */

interface Props {
  gold:   number
  silver: number
  bronze: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** show labelled rows (disc × count) — for profile hero */
  showLabels?: boolean
  /** suppress the ×N count — use when exact medal count is unknown */
  hideCount?: boolean
  /** legacy dot mode: render individual plain discs in a row (unused in new design) */
  cap?: number
}

// Metallic colour stops for each medal type
const DISC_PALETTE = {
  gold:   { light: '#FFE566', dark: '#B8860B', rim: 'rgba(255,255,255,0.30)' },
  silver: { light: '#F2F2F2', dark: '#808080', rim: 'rgba(255,255,255,0.25)' },
  bronze: { light: '#DFA060', dark: '#7B3F00', rim: 'rgba(255,255,255,0.20)' },
}

// IOC official ring colours (top-left → top-right, then bottom-left → bottom-right)
const RING_COLORS = ['#0081C8', '#222222', '#EE334E', '#FCB131', '#00A651']

/**
 * Single Olympic medal disc — metallic gradient background + 5 rings.
 */
export function OlympicMedalDisc({
  type,
  size = 28,
}: {
  type: 'gold' | 'silver' | 'bronze'
  size?: number
}) {
  const p   = DISC_PALETTE[type]
  const uid = `omd-${type}-${size}`
  const vb  = 28                  // internal viewBox units
  const mid = vb / 2              // 14

  // Ring layout inside the disc
  const r   = 3.4                 // ring radius
  const sw  = 1.15                // stroke width
  const dx  = 5.6                 // horizontal spacing (centre-to-centre)
  const topY = mid - 2.2
  const botY = topY + 4.4

  const rings = [
    { cx: mid - dx,    cy: topY, color: RING_COLORS[0] },  // Blue
    { cx: mid,         cy: topY, color: RING_COLORS[1] },  // Black
    { cx: mid + dx,    cy: topY, color: RING_COLORS[2] },  // Red
    { cx: mid - dx/2,  cy: botY, color: RING_COLORS[3] },  // Yellow
    { cx: mid + dx/2,  cy: botY, color: RING_COLORS[4] },  // Green
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      aria-label={`${type} medal`}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="35%" cy="28%" r="72%">
          <stop offset="0%"   stopColor={p.light} />
          <stop offset="100%" stopColor={p.dark}  />
        </radialGradient>
      </defs>

      {/* Metallic disc */}
      <circle cx={mid} cy={mid} r={mid - 0.6} fill={`url(#${uid}-bg)`} />

      {/* Outer rim */}
      <circle cx={mid} cy={mid} r={mid - 0.6} fill="none" stroke={p.rim} strokeWidth="1" />

      {/* Olympic rings — simple (no interlacing at this scale) */}
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={ring.cx}
          cy={ring.cy}
          r={r}
          fill="none"
          stroke={ring.color}
          strokeWidth={sw}
        />
      ))}

      {/* Specular glint */}
      <ellipse cx={mid - 3.5} cy={mid - 4.5} rx={3.8} ry={2.2} fill="rgba(255,255,255,0.18)" />
    </svg>
  )
}

// ── Card compact mode ─────────────────────────────────────────────────────────

interface CardMedalRowProps {
  type: 'gold' | 'silver' | 'bronze'
  count: number
  discSize: number
}

const COUNT_COLORS = {
  gold:   '#FFD700',
  silver: '#C8C8C8',
  bronze: '#CD7F32',
}

function CardMedalRow({ type, count, discSize, hideCount }: CardMedalRowProps & { hideCount?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <OlympicMedalDisc type={type} size={discSize} />
      {!hideCount && (
        <span
          className="font-bold leading-none"
          style={{ fontSize: discSize * 0.5, color: COUNT_COLORS[type] }}
        >
          ×{count}
        </span>
      )}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

const SIZES = { xs: 18, sm: 22, md: 28, lg: 36 }

export default function MedalDots({
  gold,
  silver,
  bronze,
  size = 'sm',
  showLabels = false,
  hideCount = false,
}: Props) {
  const total = gold + silver + bronze
  if (total === 0) return null

  const px = SIZES[size]

  if (showLabels) {
    // Profile hero — larger discs with word labels
    const labelPx = SIZES['md']
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {gold > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <OlympicMedalDisc type="gold" size={labelPx} />
            <span className="text-white/90 font-semibold text-sm">×{gold}</span>
          </span>
        )}
        {silver > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <OlympicMedalDisc type="silver" size={labelPx} />
            <span className="text-white/90 font-semibold text-sm">×{silver}</span>
          </span>
        )}
        {bronze > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <OlympicMedalDisc type="bronze" size={labelPx} />
            <span className="text-white/90 font-semibold text-sm">×{bronze}</span>
          </span>
        )}
      </div>
    )
  }

  // Card mode — stacked rows of disc + count
  return (
    <div className="flex flex-col items-end gap-0.5">
      {gold   > 0 && <CardMedalRow type="gold"   count={gold}   discSize={px} hideCount={hideCount} />}
      {silver > 0 && <CardMedalRow type="silver" count={silver} discSize={px} hideCount={hideCount} />}
      {bronze > 0 && <CardMedalRow type="bronze" count={bronze} discSize={px} hideCount={hideCount} />}
    </div>
  )
}
