/**
 * shareCard.ts — render a shareable square PNG of a fan's Olympic archetype.
 * Pure canvas, no dependencies. Used by the "Share my archetype" button on the
 * quiz results screen for organic, image-based distribution.
 */

export interface ArchetypeCardOpts {
  name: string
  emoji: string
  color: string
  tagline: string
  distPct?: number
  athleteName?: string
}

const SIZE = 1080

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function buildArchetypeCard(o: ArchetypeCardOpts): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#06061A'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Color glow (top center)
  const glow = ctx.createRadialGradient(SIZE / 2, SIZE * 0.32, 0, SIZE / 2, SIZE * 0.32, SIZE * 0.65)
  glow.addColorStop(0, hexToRgba(o.color, 0.22))
  glow.addColorStop(1, 'rgba(6,6,26,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Accent frame
  ctx.strokeStyle = hexToRgba(o.color, 0.35)
  ctx.lineWidth = 4
  ctx.strokeRect(40, 40, SIZE - 80, SIZE - 80)
  ctx.fillStyle = o.color
  ctx.fillRect(40, 40, SIZE - 80, 6)

  const cx = SIZE / 2
  ctx.textAlign = 'center'

  // Brand line
  ctx.fillStyle = '#FFD700'
  ctx.font = '600 30px Inter, Arial, sans-serif'
  ctx.fillText('M Y   M A T C H   ·   O L Y M P I C S', cx, 150)

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '700 26px Inter, Arial, sans-serif'
  ctx.fillText('YOUR OLYMPIC ARCHETYPE', cx, 235)

  // Emoji
  ctx.font = '200px Arial, sans-serif'
  ctx.fillText(o.emoji, cx, 470)

  // Name (uppercase, wrapped)
  ctx.fillStyle = o.color
  ctx.font = '800 96px "Bebas Neue", Arial, sans-serif'
  const nameLines = wrap(ctx, o.name.toUpperCase(), SIZE - 200)
  let y = 600
  for (const ln of nameLines) {
    ctx.fillText(ln, cx, y)
    y += 104
  }

  // Tagline (italic, wrapped)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = 'italic 38px Inter, Arial, sans-serif'
  const tagLines = wrap(ctx, `"${o.tagline}"`, SIZE - 240)
  y += 8
  for (const ln of tagLines) {
    ctx.fillText(ln, cx, y)
    y += 52
  }

  // Distribution badge
  if (o.distPct != null) {
    y += 36
    const badge = `Only ${o.distPct}% of fans share this archetype`
    ctx.font = '700 30px Inter, Arial, sans-serif'
    const bw = ctx.measureText(badge).width + 64
    const bh = 64
    const bx = cx - bw / 2
    ctx.fillStyle = hexToRgba(o.color, 0.14)
    const r = 32
    ctx.beginPath()
    ctx.moveTo(bx + r, y - 44)
    ctx.arcTo(bx + bw, y - 44, bx + bw, y - 44 + bh, r)
    ctx.arcTo(bx + bw, y - 44 + bh, bx, y - 44 + bh, r)
    ctx.arcTo(bx, y - 44 + bh, bx, y - 44, r)
    ctx.arcTo(bx, y - 44, bx + bw, y - 44, r)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = o.color
    ctx.fillText(badge, cx, y)
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '500 32px Inter, Arial, sans-serif'
  const footer = o.athleteName
    ? `Matched with ${o.athleteName} · What's your match?`
    : `Take the quiz · What's your Olympic match?`
  ctx.fillText(footer, cx, SIZE - 90)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

export interface MatchCardOpts {
  athleteName: string
  flag: string
  country: string
  sport: string
  stars: number
  reasons: { icon: string; label: string }[]
  persona?: string
  color?: string
}

export async function buildMatchCard(o: MatchCardOpts): Promise<Blob> {
  const color = o.color ?? '#FFD700'
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#06061A'
  ctx.fillRect(0, 0, SIZE, SIZE)

  const glow = ctx.createRadialGradient(SIZE / 2, SIZE * 0.34, 0, SIZE / 2, SIZE * 0.34, SIZE * 0.62)
  glow.addColorStop(0, hexToRgba(color, 0.2))
  glow.addColorStop(1, 'rgba(6,6,26,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.strokeStyle = hexToRgba(color, 0.35)
  ctx.lineWidth = 4
  ctx.strokeRect(40, 40, SIZE - 80, SIZE - 80)
  ctx.fillStyle = color
  ctx.fillRect(40, 40, SIZE - 80, 6)

  const cx = SIZE / 2
  ctx.textAlign = 'center'

  ctx.fillStyle = '#FFD700'
  ctx.font = '600 30px Inter, Arial, sans-serif'
  ctx.fillText('M Y   M A T C H   ·   O L Y M P I C S', cx, 150)

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '700 26px Inter, Arial, sans-serif'
  ctx.fillText('MY TOP OLYMPIC MATCH', cx, 230)

  // Flag
  ctx.font = '150px Arial, sans-serif'
  ctx.fillText(o.flag, cx, 410)

  // Athlete name
  ctx.fillStyle = color
  ctx.font = '800 92px "Bebas Neue", Arial, sans-serif'
  const nameLines = wrap(ctx, o.athleteName.toUpperCase(), SIZE - 200)
  let y = 530
  for (const ln of nameLines) { ctx.fillText(ln, cx, y); y += 100 }

  // Country · sport
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '40px Inter, Arial, sans-serif'
  ctx.fillText(`${o.country}  ·  ${o.sport}`, cx, y + 6)
  y += 70

  // Stars
  const full = Math.round(o.stars)
  ctx.fillStyle = color
  ctx.font = '48px Arial, sans-serif'
  ctx.fillText('★'.repeat(Math.max(0, Math.min(5, full))) + '☆'.repeat(Math.max(0, 5 - full)), cx, y)
  y += 70

  // Reason chips (top 3) as centered lines
  ctx.font = '600 34px Inter, Arial, sans-serif'
  for (const r of o.reasons.slice(0, 3)) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    const line = `${r.icon}  ${r.label}`
    ctx.fillText(line, cx, y)
    y += 52
  }

  if (o.persona) {
    y += 14
    ctx.fillStyle = color
    ctx.font = '700 32px Inter, Arial, sans-serif'
    ctx.fillText(o.persona, cx, y)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '500 32px Inter, Arial, sans-serif'
  ctx.fillText('Find your Olympic match · take the quiz', cx, SIZE - 80)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}
