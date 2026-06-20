/**
 * athleteLabel.ts — fan-connection archetypes for every athlete.
 *
 * Each label answers "why would a fan feel something for this person?" rather
 * than "what have they won?". Every athlete gets exactly ONE label: the first
 * rule that matches, top to bottom (priority = a strong, rare signal beats a
 * common one).
 *
 * This MIRRORS backend/services/athlete_labels.py — the backend is the source of
 * truth so the Discover filter can run across the whole dataset. Prefer the
 * `label` key returned by the API (labelByKey); fall back to labelFor() only
 * when a record has no server-computed label (e.g. legacy athletes).
 *
 * Every signal is derived from the Wikipedia/Wikidata ingest:
 *   medals, flagbearer status, number of Games, pageviews (buzz), star rating,
 *   and country — so each classification is grounded in real, citable data.
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
  label?: string   // server-computed key (preferred when present)
}

export const ATHLETE_LABELS: AthleteLabel[] = [
  {
    key: 'legend',
    label: 'The Legend',
    emoji: '🏛️',
    color: '#A78BFA',
    blurb: 'Two or more Olympic golds — a name written into the history of the Games.',
  },
  {
    key: 'champion',
    label: 'The Champion',
    emoji: '👑',
    color: '#FFD700',
    blurb: 'An Olympic gold medallist — they stood on top of the world.',
  },
  {
    key: 'hometown',
    label: 'Hometown Hero',
    emoji: '🚩',
    color: '#E63946',
    blurb: "Chosen to carry their nation's flag — a whole country walked in behind them.",
  },
  {
    key: 'fan_favorite',
    label: 'Fan Favorite',
    emoji: '⭐',
    color: '#F59E0B',
    blurb: 'An Olympic medallist (silver or bronze) — on the podium, and adored for it.',
  },
  {
    key: 'grinder',
    label: 'The Grinder',
    emoji: '💪',
    color: '#457B9D',
    blurb: "They've built a real career in the sport — recognized, battle-tested, and still showing up without the spotlight.",
  },
  {
    key: 'one_to_watch',
    label: 'One to Watch',
    emoji: '👀',
    color: '#38BDF8',
    blurb: "No medal yet, but huge buzz heading in — the breakout you'll want to say you saw first.",
  },
  {
    key: 'underdog',
    label: 'The Underdog',
    emoji: '🔥',
    color: '#34D399',
    blurb: 'A long shot with a real footing — the experience or pipeline to pull off an upset.',
  },
  {
    key: 'trailblazer',
    label: 'The Trailblazer',
    emoji: '🧭',
    color: '#FB923C',
    blurb: 'Representing where there’s no pipeline — making history just by being on the start line.',
  },
]

const BY_KEY = Object.fromEntries(ATHLETE_LABELS.map(l => [l.key, l]))

/** Resolve a server-computed label key (from the API) to its display metadata. */
export function labelByKey(key?: string): AthleteLabel | undefined {
  return key ? BY_KEY[key] : undefined
}

// Strong Olympic nations — mirror of POWERHOUSE in athlete_labels.py.
const POWERHOUSE = new Set([
  'United States', 'China', 'United Kingdom', 'Great Britain', 'France', 'Germany', 'Japan',
  'Australia', 'Italy', 'Netherlands', 'Canada', 'South Korea', 'Brazil', 'Spain', 'Hungary',
  'Sweden', 'Norway', 'Austria', 'Switzerland', 'New Zealand', 'Poland', 'Czech Republic',
  'Finland', 'Denmark', 'Belgium', 'Croatia', 'Jamaica', 'Kenya', 'Ethiopia', 'Cuba', 'Ukraine',
])

/**
 * Compute the label for an athlete. Prefers the server-computed `label` key when
 * present; otherwise derives it locally with the same rules as the backend.
 */
export function labelFor(a: Input): AthleteLabel {
  const fromServer = labelByKey(a.label)
  if (fromServer) return fromServer

  const gold  = a.medal_totals?.gold  ?? 0
  const totalMedals = gold + (a.medal_totals?.silver ?? 0) + (a.medal_totals?.bronze ?? 0)
  const games = a.games?.length ?? 1
  const flag  = a.is_flagbearer_open || a.is_flagbearer_close
  const stars = a.stars ?? 3
  const pv    = a.pageviews_60d ?? 0
  const powerhouse = a.country ? POWERHOUSE.has(a.country) : false

  if (gold >= 2) return BY_KEY.legend
  if (gold === 1) return BY_KEY.champion
  if (flag) return BY_KEY.hometown
  if (totalMedals > 0) return BY_KEY.fan_favorite
  if (stars >= 4 || pv >= 40000) return BY_KEY.one_to_watch
  if (stars >= 3) return BY_KEY.grinder
  if (powerhouse) return BY_KEY.underdog

  return BY_KEY.trailblazer
}
