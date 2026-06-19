const BASE = '/api'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export interface NewsArticle {
  title: string
  url: string
  summary: string
  source: string
  published?: string
  date?: string
  _score?: number
}

export interface NewsResult {
  articles: NewsArticle[]
  fetched_at: number
  stale: boolean
  source: 'fresh' | 'cache' | 'stale_cache' | 'empty' | 'scraped' | 'generated'
}

export type GamesKey = 'paris_2024' | 'milan_2026'

export interface MedalTotals {
  gold: number
  silver: number
  bronze: number
}

export interface AthleteRecord {
  id: string
  qid?: string
  name: string
  country: string
  flag: string
  sport: string
  gender?: string
  games?: GamesKey[]
  events?: string[]
  is_medalist?: boolean
  medalist_in?: GamesKey[]
  medal_totals?: MedalTotals
  is_flagbearer_open?: boolean
  is_flagbearer_close?: boolean
  pageviews_60d?: number
  stars: number
  wikipedia_url?: string
  thumbnail?: string  // Wikipedia photo URL
  // Canonical sponsorship signals — attached by the list + business endpoints
  // (single source of truth: backend business_metrics) so every view agrees.
  marketability_score?: number
  deal_tier?: string
  tier_color?: string
  available_categories?: string[]
}

export interface AthletePage {
  total: number
  offset: number
  limit: number
  items: AthleteRecord[]
}

export interface AthleteQuery {
  games?: GamesKey
  sport?: string
  country?: string
  min_stars?: number
  medalist_only?: boolean
  search?: string
  limit?: number
  offset?: number
}

function qs(p: AthleteQuery): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) {
      usp.set(k, String(v))
    }
  }
  return usp.toString() ? `?${usp.toString()}` : ''
}

export interface MatchProfile {
  games?: GamesKey
  country?: string
  current_country?: string
  childhood_sports?: string[]
  story_type?: 'underdog' | 'dominance' | 'culture' | 'mental_health'
  personality?: 'hype' | 'grind' | 'mix'
  limit?: number
}

export interface MatchReason { icon: string; label: string }
export interface MatchResult {
  athlete: AthleteRecord
  score: number
  reasons: MatchReason[]
  stars: number
}
export interface MatchResponse {
  matches: MatchResult[]
  diagnostics: { pool_size: number; from_your_country: number; your_sport: number }
}

export const api = {
  getAthletes:  (q: AthleteQuery = {}) => req<AthletePage>(`/athletes${qs(q)}`),
  getAthlete:   (id: string)           => req<AthleteRecord>(`/athletes/${id}`),
  getSports:    (games?: GamesKey)     => req<{ sports: string[] }>(`/athletes/sports${games ? `?games=${games}` : ''}`),
  getCountries: (games?: GamesKey)     => req<{ countries: string[] }>(`/athletes/countries${games ? `?games=${games}` : ''}`),
  getNews:      (athleteId: string)    => req<NewsResult>(`/news/${athleteId}`),
  refreshNews:  (athleteId: string)    => req<NewsResult>(`/news/${athleteId}/refresh`, { method: 'POST' }),
  getOfferings: (athleteId: string)    => req<unknown[]>(`/offerings/${athleteId}`),
  match:        (profile: MatchProfile) =>
                  req<MatchResponse>('/match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profile),
                  }),
}
