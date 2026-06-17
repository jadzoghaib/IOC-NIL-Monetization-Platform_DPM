import { useState, useEffect } from 'react'

export const CATEGORIES = ['Sportswear', 'Nutrition', 'Tech/Devices', 'Automotive', 'Beverages', 'Finance']
export const DEAL_TYPES  = [
  { id: 'social_post',       label: 'Social Posts',       icon: '📱' },
  { id: 'event_appearance',  label: 'Event Appearances',  icon: '🎤' },
  { id: 'brand_ambassador',  label: 'Brand Ambassador',   icon: '🤝' },
  { id: 'content_creation',  label: 'Content Creation',   icon: '🎬' },
  { id: 'product_collab',    label: 'Product Collab',     icon: '🛍️' },
]
export const REGIONS = [
  'Worldwide', 'Europe', 'North America', 'South America',
  'Asia-Pacific', 'Middle East & Africa',
]
export const LANGUAGES = [
  'English', 'French', 'Spanish', 'German', 'Italian', 'Portuguese',
  'Arabic', 'Chinese', 'Japanese', 'Korean', 'Swedish', 'Norwegian',
]

export interface SocialAccount {
  handle:      string
  followers?:  number   // pulled when connected
  engagement?: number   // pulled when connected
  connected:   boolean
}

export interface AthleteProfile {
  athleteId:    string
  athleteName:  string
  sport:        string
  flag:         string
  country:      string
  thumbnail?:   string

  // Social accounts
  instagram?:   SocialAccount
  tiktok?:      SocialAccount
  youtube?:     SocialAccount
  twitter?:     SocialAccount

  // Sponsorship availability
  categoriesTaken:   string[]   // already contracted
  categoriesBlocked: string[]   // would never accept
  openToPartnerships: boolean

  // Deal preferences
  dealTypesOpen: string[]   // which deal types they're open to

  // Pricing (USD)
  pricingSocialPost?:    { min: number; max: number }
  pricingEvent?:         { min: number; max: number }
  pricingAmbassador?:    { min: number; max: number }

  // Story
  bio:        string
  languages:  string[]
  regions:    string[]

  // Meta
  completedOnboarding: boolean
  updatedAt: string
}

const STORAGE_KEY = 'athlete_profile_v1'

const EMPTY: AthleteProfile = {
  athleteId:    '',
  athleteName:  '',
  sport:        '',
  flag:         '',
  country:      '',
  categoriesTaken:    [],
  categoriesBlocked:  [],
  openToPartnerships: true,
  dealTypesOpen:      ['social_post', 'event_appearance', 'brand_ambassador'],
  bio:                '',
  languages:          ['English'],
  regions:            ['Worldwide'],
  completedOnboarding: false,
  updatedAt: new Date().toISOString(),
}

function load(): AthleteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {}
  return { ...EMPTY }
}

function completeness(p: AthleteProfile): number {
  let score = 0
  if (p.athleteId)                                         score += 20
  if (p.instagram?.connected || p.tiktok?.connected || p.youtube?.connected) score += 20
  if (p.categoriesTaken.length > 0 || p.categoriesBlocked.length > 0)        score += 20
  if (p.pricingSocialPost || p.pricingEvent || p.pricingAmbassador)           score += 20
  if (p.bio.trim().length > 30)                            score += 20
  return score
}

export function useAthleteProfile() {
  const [profile, setProfile] = useState<AthleteProfile>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  const update = (patch: Partial<AthleteProfile>) =>
    setProfile(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }))

  const reset = () => setProfile({ ...EMPTY })

  const connectSocial = (
    platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter',
    handle: string
  ) => {
    // Stub: generate plausible follower count from athlete's known profile
    // In production this would call the respective platform API
    const seed = handle.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const reach = profile.athleteId ? 50_000 + (seed % 2_000_000) : 10_000
    const er    = 1.5 + (seed % 60) / 10   // 1.5–7.5%

    update({
      [platform]: {
        handle,
        followers:  Math.round(reach),
        engagement: Math.round(er * 10) / 10,
        connected:  true,
      }
    })
  }

  const disconnectSocial = (platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter') =>
    update({ [platform]: undefined })

  return {
    profile,
    update,
    reset,
    connectSocial,
    disconnectSocial,
    completeness: completeness(profile),
  }
}
