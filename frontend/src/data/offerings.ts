export type OfferingCategory = 'fan' | 'media' | 'corporate' | 'community'

export interface Offering {
  id: string
  category: OfferingCategory
  icon: string
  title: string
  tagline: string
  description: string
  audience: string
  priceFrom: number
  priceUnit: string   // 'per appearance' | 'per event' | 'per session' | 'per person'
  cta: string
  highlight?: boolean // gold treatment for the signature offering
  badge?: string      // optional badge text e.g. "Most Popular"
}

// ── Category meta ─────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<OfferingCategory, { label: string; color: string; bg: string }> = {
  fan:       { label: 'For Fans',              color: '#FFD700', bg: 'rgba(255,215,0,0.10)'       },
  media:     { label: 'Media & Podcasters',    color: '#38BDF8', bg: 'rgba(56,189,248,0.10)'      },
  corporate: { label: 'Events & Conferences',  color: '#A78BFA', bg: 'rgba(167,139,250,0.10)'     },
  community: { label: 'Clubs & Coaching',      color: '#34D399', bg: 'rgba(52,211,153,0.10)'      },
}

// ── Default portfolio (used for all athletes) ─────────────────────────────────

export function getPortfolio(firstName: string): Offering[] {
  return [
    {
      id: 'podcast',
      category: 'media',
      icon: '🎙️',
      title: 'Podcast Appearance',
      tagline: 'Your audience, my story',
      description: `Book ${firstName} for an exclusive interview on your podcast or show — training philosophy, Olympic moments, and the mindset behind the performance. Available remote or in-studio.`,
      audience: 'Media & Podcasters',
      priceFrom: 500,
      priceUnit: 'per appearance',
      cta: 'Request Appearance',
    },
    {
      id: 'speaker',
      category: 'corporate',
      icon: '🎤',
      title: 'Guest Speaker',
      tagline: 'Olympic mindset, delivered live',
      description: `${firstName} delivers keynote talks or panel discussions for corporate events, conferences, and schools. Topics include resilience, peak performance, and goal-setting under pressure.`,
      audience: 'Events & Conferences',
      priceFrom: 2500,
      priceUnit: 'per event',
      cta: 'Check Availability',
      badge: 'High Demand',
    },
    {
      id: 'community',
      category: 'community',
      icon: '🏟️',
      title: 'Club & Community Visit',
      tagline: 'Bring the Olympics to your club',
      description: `${firstName} visits your club, school, or coaching program for a masterclass, Q&A, or training clinic. Ideal for youth academies, grassroots programs, and national federation events.`,
      audience: 'Clubs & Coaches',
      priceFrom: 800,
      priceUnit: 'per session',
      cta: 'Request a Visit',
    },
    {
      id: 'train',
      category: 'fan',
      icon: '⚡',
      title: 'Come Train With Me',
      tagline: 'Side by side with an Olympian',
      description: `Join ${firstName} for a hands-on training session. Limited spots available — feel what it takes to compete at the highest level, get personalised feedback, and take home memories that last a lifetime.`,
      audience: 'Fans',
      priceFrom: 150,
      priceUnit: 'per person',
      cta: 'Reserve a Spot',
      highlight: true,
      badge: 'Fan Favourite',
    },
  ]
}

// ── Legacy archetype-based offerings (kept for the original 48 athletes) ──────

export interface LegacyOffering {
  id: string
  type: 'subscription' | 'custom'
  title: string
  description: string
  price: number
  period?: 'month'
  sponsor?: string
  sponsorLabel?: string
  slotsAvailable?: number
}

const PRICES: Record<string, { sub: number; custom: number }> = {
  ambition:    { sub: 14.99, custom: 299 },
  unity:       { sub: 9.99,  custom: 149 },
  inspiration: { sub: 12.99, custom: 499 },
  legacy:      { sub: 19.99, custom: 999 },
}

const SPONSORS: Record<string, string> = {
  'ambition-social': 'Coca-Cola', 'ambition-competitive': 'Omega', 'ambition-reflective': 'Intel',
  'unity-social': 'Visa', 'unity-competitive': 'Samsung', 'unity-reflective': 'Alibaba',
  'inspiration-social': 'P&G', 'inspiration-competitive': 'Toyota', 'inspiration-reflective': 'Airbnb',
  'legacy-social': 'Panasonic', 'legacy-competitive': 'Bridgestone', 'legacy-reflective': 'Atos',
}

export function getOfferings(athleteId: string): LegacyOffering[] {
  const parts = athleteId.split('_')
  if (parts.length < 2) return []
  const mot = parts[0]
  const eng = parts[1]
  const archetypeKey = `${mot}-${eng}`
  const prices = PRICES[mot] ?? { sub: 12.99, custom: 299 }
  const sponsor = SPONSORS[archetypeKey]

  const SUB_TITLES: Record<string, string> = {
    ambition: 'Training Intensity Series', unity: 'Community Watch-Alongs + Q&A',
    inspiration: 'Behind-the-Scenes Journey Vlogs', legacy: 'Historical Archive + Commentary',
  }
  const CUSTOM_TITLES: Record<string, string> = {
    ambition: 'Training Center Visit', unity: 'Virtual Team Signing Session',
    inspiration: 'Personal Motivational Call (30 min)', legacy: 'Spend a Day at Their Facility',
  }

  return [
    {
      id: `${athleteId}_sub`,
      type: 'subscription',
      title: `Premium Access — ${SUB_TITLES[mot] ?? 'Behind-the-Scenes'}`,
      description: 'Exclusive monthly content from training sessions, race prep rituals, and personal reflections.',
      price: prices.sub,
      period: 'month',
    },
    {
      id: `${athleteId}_exp`,
      type: 'custom',
      title: CUSTOM_TITLES[mot] ?? 'Meet & Experience',
      description: 'A one-of-a-kind in-person or virtual experience. Limited slots available.',
      price: prices.custom,
      sponsor,
      sponsorLabel: sponsor ? `Presented by ${sponsor}` : undefined,
      slotsAvailable: mot === 'legacy' ? 3 : mot === 'inspiration' ? 5 : 10,
    },
  ]
}
