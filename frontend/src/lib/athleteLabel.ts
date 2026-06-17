/**
 * athleteLabel.ts — fan-connection archetypes for every athlete.
 * Each label answers "why would a fan feel something for this person?"
 * rather than "what have they won?" — the goal is personal resonance,
 * not a performance leaderboard.
 */
export interface AthleteLabel {
  key: string
  label: string
  emoji: string
  color: string
  blurb: string
}

interface Input {
  is_medalist?: boolean
  medal_totals?: { gold: number; silver: number; bronze: number }
  stars?: number
  games?: string[]
  pageviews_60d?: number
  is_flagbearer_open?: boolean
  is_flagbearer_close?: boolean
  country?: string
}

export const ATHLETE_LABELS: AthleteLabel[] = [
  {
    key: 'legend',
    label: 'The Legend',
    emoji: '🏛️',
    color: '#A78BFA',
    blurb: "A name written into Olympic history. You're watching greatness.",
  },
  {
    key: 'champion',
    label: 'The Champion',
    emoji: '👑',
    color: '#FFD700',
    blurb: "They stood where everyone wants to stand — on top of the world.",
  },
  {
    key: 'hometown',
    label: 'Hometown Hero',
    emoji: '🚩',
    color: '#E63946',
    blurb: "Their whole country was watching. They carried every flag.",
  },
  {
    key: 'fan_favorite',
    label: 'Fan Favorite',
    emoji: '⭐',
    color: '#F59E0B',
    blurb: "Not chosen by the scoreboard — chosen by the fans. That says more.",
  },
  {
    key: 'one_to_watch',
    label: 'One to Watch',
    emoji: '👀',
    color: '#38BDF8',
    blurb: "Everyone's about to know their name. You know it first.",
  },
  {
    key: 'grinder',
    label: 'The Grinder',
    emoji: '💪',
    color: '#457B9D',
    blurb: "Multiple Olympics. Still going. The sport can't shake them.",
  },
  {
    key: 'underdog',
    label: 'The Underdog',
    emoji: '🔥',
    color: '#34D399',
    blurb: "Everyone counted them out. Don't.",
  },
  {
    key: 'trailblazer',
    label: 'The Trailblazer',
    emoji: '🧭',
    color: '#FB923C',
    blurb: "The first. The only. Making history just by showing up.",
  },
]

const BY_KEY = Object.fromEntries(ATHLETE_LABELS.map(l => [l.key, l]))

// Strong Olympic nations — athletes from outside this set who lack real
// competitive signal are Trailblazers (representing where there's no pipeline)
// rather than Underdogs (a dark horse with a genuine shot).
const POWERHOUSE = new Set([
  'United States', 'China', 'United Kingdom', 'Great Britain', 'France', 'Germany', 'Japan',
  'Australia', 'Italy', 'Netherlands', 'Canada', 'South Korea', 'Brazil', 'Spain', 'Hungary',
  'Sweden', 'Norway', 'Austria', 'Switzerland', 'New Zealand', 'Poland', 'Czech Republic',
  'Finland', 'Denmark', 'Belgium', 'Croatia', 'Jamaica', 'Kenya', 'Ethiopia', 'Cuba', 'Ukraine',
])

export function labelFor(a: Input): AthleteLabel {
  const gold  = a.medal_totals?.gold  ?? 0
  const totalMedals = gold + (a.medal_totals?.silver ?? 0) + (a.medal_totals?.bronze ?? 0)
  const games = a.games?.length ?? 1
  const flag  = a.is_flagbearer_open || a.is_flagbearer_close
  const stars = a.stars ?? 3
  const pv    = a.pageviews_60d ?? 0
  const powerhouse = a.country ? POWERHOUSE.has(a.country) : false

  // ── Performance tier (rare, high-status) ──────────────────────────────────
  if (gold >= 2) return BY_KEY.legend    // multi-gold royalty
  if (gold === 1) return BY_KEY.champion  // peak of the sport

  // ── National identity ──────────────────────────────────────────────────────
  if (flag) return BY_KEY.hometown

  // ── Fan-chosen ─────────────────────────────────────────────────────────────
  // Silver/bronze athletes — the fans' heroes on the podium
  if (totalMedals > 0) return BY_KEY.fan_favorite

  // ── Buzz / trajectory ─────────────────────────────────────────────────────
  // High engagement even without medals — the crowd already picked them
  if (stars >= 4 || pv >= 40000) return BY_KEY.one_to_watch

  // ── Perseverance ──────────────────────────────────────────────────────────
  // 3+ Olympic Games, no gold — keeps coming back, season after season
  if (games >= 3) return BY_KEY.grinder

  // ── Competitive shot ──────────────────────────────────────────────────────
  // Has the infrastructure/experience/buzz to pull an upset
  const hasShot = (powerhouse && stars >= 3) || (games >= 2 && stars >= 2) || (powerhouse && games >= 2)
  if (hasShot) return BY_KEY.underdog

  // ── Pioneer ───────────────────────────────────────────────────────────────
  return BY_KEY.trailblazer
}
