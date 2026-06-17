/**
 * Olympic rings — 5 interlocked circles, correct weave + ring-gap knockout.
 *
 * Weave (alternating chain):  Blue > Yellow > Black > Green > Red
 * Layers:
 *   1. Yellow, Green (drawn first = behind)
 *   2. Blue, Black, Red (each preceded by a wider "knockout" stroke in --bg
 *      to create a visible gap where rings cross)
 *   3. Yellow-right, Green-right arcs (re-drawn on top of Black / Red,
 *      also with knockout)
 */

const R   = 20     // ring centre-line radius
const SW  = 4.6    // stroke width
const KO  = 3.2    // extra width on each side of the knockout (gap between rings)
const KSW = SW + KO * 2   // total knockout stroke width

const GAP  = 34    // horizontal centre-to-centre between adjacent chain rings
const VERT = 19    // vertical offset between rows

const TOP_Y = R + KSW / 2 + 1
const BOT_Y = TOP_Y + VERT

const BL_X = R + KSW / 2 + 1
const YL_X = BL_X + GAP
const BK_X = BL_X + GAP * 2
const GR_X = BL_X + GAP * 3
const RD_X = BL_X + GAP * 4

const W = RD_X + R + KSW / 2 + 1
const H = BOT_Y + R + KSW / 2 + 1

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
  mono?: boolean
}

const SCALE = { xs: 0.38, sm: 0.58, md: 0.92, lg: 1.38 }

export default function OlympicRings({ size = 'md', animate = false, className, mono = false }: Props) {
  const scale = SCALE[size]
  const c = (col: string) => mono ? 'var(--ring-mono, #F5F7FA)' : col
  // In mono mode keep a slightly lighter knockout so the gap is still visible
  const ko = 'var(--bg, #0A0B0D)'

  // Helper props for animation (disabled by default for crispness)
  const ap = animate
    ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 } }
    : {}

  return (
    <svg
      width={W * scale}
      height={H * scale}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Olympic rings"
    >
      <defs>
        {/* Clip Yellow's re-drawn arc to the right of the Yellow-Black midpoint */}
        <clipPath id="yl-right">
          <rect x={YL_X + GAP / 2} y="0" width={W} height={H} />
        </clipPath>
        {/* Clip Green's re-drawn arc to the right of the Green-Red midpoint */}
        <clipPath id="gr-right">
          <rect x={GR_X + GAP / 2} y="0" width={W} height={H} />
        </clipPath>
      </defs>

      {/* ── Layer 1: bottom row (behind everything) ── */}
      <circle cx={YL_X} cy={BOT_Y} r={R} stroke={c('#FCB131')} strokeWidth={SW} />
      <circle cx={GR_X} cy={BOT_Y} r={R} stroke={c('#009F3D')} strokeWidth={SW} />

      {/* ── Layer 2: top row with knockout gap ── */}
      {/* Blue over Yellow */}
      <circle cx={BL_X} cy={TOP_Y} r={R} stroke={ko} strokeWidth={KSW} />
      <circle cx={BL_X} cy={TOP_Y} r={R} stroke={c('#0081C8')} strokeWidth={SW} />
      {/* Black over Yellow (left) and Green (left) */}
      <circle cx={BK_X} cy={TOP_Y} r={R} stroke={ko} strokeWidth={KSW} />
      <circle cx={BK_X} cy={TOP_Y} r={R} stroke={c('#2a2a2a')} strokeWidth={SW} />
      {/* Red over Green */}
      <circle cx={RD_X} cy={TOP_Y} r={R} stroke={ko} strokeWidth={KSW} />
      <circle cx={RD_X} cy={TOP_Y} r={R} stroke={c('#EE334E')} strokeWidth={SW} />

      {/* ── Layer 3: Yellow right-arc over Black; Green right-arc over Red ── */}
      <circle cx={YL_X} cy={BOT_Y} r={R} stroke={ko} strokeWidth={KSW} clipPath="url(#yl-right)" />
      <circle cx={YL_X} cy={BOT_Y} r={R} stroke={c('#FCB131')} strokeWidth={SW} clipPath="url(#yl-right)" />
      <circle cx={GR_X} cy={BOT_Y} r={R} stroke={ko} strokeWidth={KSW} clipPath="url(#gr-right)" />
      <circle cx={GR_X} cy={BOT_Y} r={R} stroke={c('#009F3D')} strokeWidth={SW} clipPath="url(#gr-right)" />
    </svg>
  )
}
