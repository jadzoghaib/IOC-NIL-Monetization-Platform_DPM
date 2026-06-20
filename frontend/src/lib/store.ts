/**
 * store.ts — demo persistence layer (localStorage-backed, reactive).
 *
 * Everything athletes create (posts, courses, availability) and everything
 * sponsors create (campaigns, offers) lives here. It is intentionally the ONLY
 * module that touches storage, so swapping localStorage → Supabase/Postgres
 * later is a single-file change.
 *
 * Reactivity: components subscribe via `useStoreVersion()` and re-read with the
 * list/get helpers. Mutations bump a version counter and notify subscribers,
 * so the sponsor→athlete offer loop updates live within a browser session.
 */
import { useSyncExternalStore } from 'react'

// ── Shared vocab ──────────────────────────────────────────────────────────────
export type DealType =
  | 'social_post'
  | 'event_appearance'
  | 'brand_ambassador'
  | 'content_creation'
  | 'product_collab'

export const DEAL_TYPE_META: Record<DealType, { label: string; icon: string }> = {
  social_post:      { label: 'Social Post',      icon: '📱' },
  event_appearance: { label: 'Event Appearance', icon: '🎤' },
  brand_ambassador: { label: 'Brand Ambassador', icon: '🤝' },
  content_creation: { label: 'Content Creation', icon: '🎬' },
  product_collab:   { label: 'Product Collab',   icon: '🛍️' },
}

export const CATEGORIES = ['Sportswear', 'Nutrition', 'Tech/Devices', 'Automotive', 'Beverages', 'Finance']
export const REGIONS = ['Worldwide', 'Europe', 'North America', 'South America', 'Asia-Pacific', 'Middle East & Africa']
export const BUDGET_BANDS = ['$1K–$5K', '$5K–$25K', '$25K–$100K', '$100K+']

export const POST_KINDS = ['photo', 'video', 'text'] as const
export type PostKind = (typeof POST_KINDS)[number]

export const AVAILABILITY_ACTIVITIES = [
  'Sponsored Post',
  'Content Shoot',
  'Live Appearance',
  'Brand Collab Day',
  'Q&A / Livestream',
] as const
export type AvailabilityActivity = (typeof AVAILABILITY_ACTIVITIES)[number]

// ── Entities ──────────────────────────────────────────────────────────────────
export interface AthletePost {
  id: string
  athleteId: string
  kind: PostKind
  caption: string
  mediaUrl?: string
  sponsoredBy?: string   // brand name when the post fulfils a sponsor deal
  likes: number
  createdAt: string
  public?: boolean       // if true, visible to all fans without a subscription
}

export interface CourseLesson {
  title: string
  duration: string
  videoId?: string     // YouTube video ID — when set and course is unlocked, renders an embedded player
  playlistId?: string  // YouTube playlist to load alongside the video
}

export interface Course {
  id: string
  athleteId: string
  title: string
  description: string
  price: number          // USD — unlock price for a standard course
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  lessons: CourseLesson[]
  format?: 'standard' | 'coaching'   // standard = lessons behind a paywall; coaching = 1:1 video review
  coachingPrice?: number             // extra for a personalised plan (coaching format)
  createdAt: string
}

export interface AvailabilitySlot {
  id: string
  athleteId: string
  date: string                 // YYYY-MM-DD
  activity: AvailabilityActivity
  note?: string
  booked: boolean
}

export interface Campaign {
  id: string
  brand: string
  name: string
  category: string
  region: string
  budgetBand: string
  goal: string
  athleteIds: string[]
  createdAt: string
}

export interface Offer {
  id: string
  campaignId?: string
  brand: string
  athleteId: string
  athleteName?: string
  dealType: DealType
  amount: number
  message: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface SponsorProfile {
  brand: string
  primaryCategory?: string
}

// ── Low-level reactive storage ────────────────────────────────────────────────
const KEY = {
  posts:        'mmo:posts',
  courses:      'mmo:courses',
  availability: 'mmo:availability',
  campaigns:    'mmo:campaigns',
  offers:       'mmo:offers',
  sponsor:      'mmo:sponsor',
  events:       'mmo:events',
} as const

let version = 0
const listeners = new Set<() => void>()
function emit() {
  version++
  listeners.forEach(l => l())
}

if (typeof window !== 'undefined') {
  // Cross-tab updates
  window.addEventListener('storage', () => emit())
}

function readArr<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeArr<T>(key: string, val: T[]) {
  localStorage.setItem(key, JSON.stringify(val))
  emit()
}

function readObj<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}

function writeObj<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val))
  emit()
}

export function uid(prefix = 'id'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rnd}`
}

// ── React binding ─────────────────────────────────────────────────────────────
function subscribeStore(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function getSnapshot() {
  return version
}
/** Re-render the calling component whenever any store slice changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribeStore, getSnapshot, getSnapshot)
}

// ── Posts ─────────────────────────────────────────────────────────────────────
export function listPosts(athleteId: string): AthletePost[] {
  return readArr<AthletePost>(KEY.posts)
    .filter(p => p.athleteId === athleteId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addPost(input: Omit<AthletePost, 'id' | 'createdAt' | 'likes'>): AthletePost {
  const post: AthletePost = { ...input, id: uid('post'), likes: 0, createdAt: new Date().toISOString() }
  writeArr(KEY.posts, [post, ...readArr<AthletePost>(KEY.posts)])
  trackEvent('post_created', { athleteId: post.athleteId, sponsored: !!post.sponsoredBy })
  return post
}

export function deletePost(id: string) {
  writeArr(KEY.posts, readArr<AthletePost>(KEY.posts).filter(p => p.id !== id))
}

export function updatePost(id: string, patch: Partial<AthletePost>) {
  writeArr(KEY.posts, readArr<AthletePost>(KEY.posts).map(p => (p.id === id ? { ...p, ...patch } : p)))
}

// ── Courses ───────────────────────────────────────────────────────────────────
export function listCourses(athleteId: string): Course[] {
  return readArr<Course>(KEY.courses)
    .filter(c => c.athleteId === athleteId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addCourse(input: Omit<Course, 'id' | 'createdAt'>): Course {
  const course: Course = { ...input, id: uid('course'), createdAt: new Date().toISOString() }
  writeArr(KEY.courses, [course, ...readArr<Course>(KEY.courses)])
  trackEvent('course_created', { athleteId: course.athleteId })
  return course
}

export function deleteCourse(id: string) {
  writeArr(KEY.courses, readArr<Course>(KEY.courses).filter(c => c.id !== id))
}

export function updateCourse(id: string, patch: Partial<Course>) {
  writeArr(KEY.courses, readArr<Course>(KEY.courses).map(c => (c.id === id ? { ...c, ...patch } : c)))
}

// ── Availability ──────────────────────────────────────────────────────────────
export function listSlots(athleteId: string): AvailabilitySlot[] {
  return readArr<AvailabilitySlot>(KEY.availability)
    .filter(s => s.athleteId === athleteId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function addSlot(input: Omit<AvailabilitySlot, 'id' | 'booked'>): AvailabilitySlot {
  const slot: AvailabilitySlot = { ...input, id: uid('slot'), booked: false }
  writeArr(KEY.availability, [...readArr<AvailabilitySlot>(KEY.availability), slot])
  return slot
}

export function deleteSlot(id: string) {
  writeArr(KEY.availability, readArr<AvailabilitySlot>(KEY.availability).filter(s => s.id !== id))
}

export function toggleSlotBooked(id: string) {
  writeArr(
    KEY.availability,
    readArr<AvailabilitySlot>(KEY.availability).map(s => (s.id === id ? { ...s, booked: !s.booked } : s)),
  )
}

export function updateSlot(id: string, patch: Partial<AvailabilitySlot>) {
  writeArr(KEY.availability, readArr<AvailabilitySlot>(KEY.availability).map(s => (s.id === id ? { ...s, ...patch } : s)))
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export function listCampaigns(): Campaign[] {
  return readArr<Campaign>(KEY.campaigns).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addCampaign(input: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
  const campaign: Campaign = { ...input, id: uid('camp'), createdAt: new Date().toISOString() }
  writeArr(KEY.campaigns, [campaign, ...readArr<Campaign>(KEY.campaigns)])
  trackEvent('campaign_created', { brand: campaign.brand, athletes: campaign.athleteIds.length })
  return campaign
}

export function deleteCampaign(id: string) {
  writeArr(KEY.campaigns, readArr<Campaign>(KEY.campaigns).filter(c => c.id !== id))
}

// ── Offers (the sponsor → athlete bridge) ─────────────────────────────────────
export function listOffers(filter?: { athleteId?: string; brand?: string; campaignId?: string }): Offer[] {
  let list = readArr<Offer>(KEY.offers)
  if (filter?.athleteId) list = list.filter(o => o.athleteId === filter.athleteId)
  if (filter?.brand) list = list.filter(o => o.brand === filter.brand)
  if (filter?.campaignId) list = list.filter(o => o.campaignId === filter.campaignId)
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addOffer(input: Omit<Offer, 'id' | 'createdAt' | 'status'>): Offer {
  const offer: Offer = { ...input, id: uid('offer'), status: 'pending', createdAt: new Date().toISOString() }
  writeArr(KEY.offers, [offer, ...readArr<Offer>(KEY.offers)])
  trackEvent('offer_sent', { athleteId: offer.athleteId, brand: offer.brand, amount: offer.amount })
  return offer
}

export function addOffers(inputs: Omit<Offer, 'id' | 'createdAt' | 'status'>[]): Offer[] {
  const now = Date.now()
  const offers: Offer[] = inputs.map((i, idx) => ({
    ...i,
    id: uid('offer'),
    status: 'pending',
    createdAt: new Date(now + idx).toISOString(),
  }))
  writeArr(KEY.offers, [...offers, ...readArr<Offer>(KEY.offers)])
  trackEvent('offers_sent_bulk', { count: offers.length, brand: offers[0]?.brand })
  return offers
}

export function setOfferStatus(id: string, status: Offer['status']) {
  writeArr(KEY.offers, readArr<Offer>(KEY.offers).map(o => (o.id === id ? { ...o, status } : o)))
  trackEvent('offer_status_changed', { offerId: id, status })
}

// ── Sponsor identity ──────────────────────────────────────────────────────────
const EMPTY_SPONSOR: SponsorProfile = { brand: '' }

export function getSponsor(): SponsorProfile {
  return readObj<SponsorProfile>(KEY.sponsor, EMPTY_SPONSOR)
}

export function setSponsor(patch: Partial<SponsorProfile>) {
  writeObj(KEY.sponsor, { ...getSponsor(), ...patch })
}

// ── Lightweight analytics (improvement: instrument the funnel) ────────────────
export interface AnalyticsEvent {
  name: string
  props?: Record<string, unknown>
  ts: string
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  const ev: AnalyticsEvent = { name, props, ts: new Date().toISOString() }
  // Keep a rolling window of the last 500 events.
  const all = [...readArr<AnalyticsEvent>(KEY.events), ev].slice(-500)
  localStorage.setItem(KEY.events, JSON.stringify(all))
  if (import.meta.env.DEV) console.debug('[analytics]', name, props ?? '')
  // NB: deliberately does NOT emit() — analytics shouldn't trigger re-renders.
}

export function listEvents(): AnalyticsEvent[] {
  return readArr<AnalyticsEvent>(KEY.events)
}

// ── Athlete rate card (pricing) ───────────────────────────────────────────────
export interface AthletePricing {
  subscription: number   // monthly "Inner Circle"
  socialPost: number     // per sponsored post
  appearance: number     // per event appearance
  ambassador: number     // per month, brand ambassador
  courseDefault: number  // suggested course price
}

const PRICING_DEFAULT: AthletePricing = {
  subscription: 9, socialPost: 500, appearance: 3000, ambassador: 8000, courseDefault: 49,
}

export function getPricing(athleteId: string): AthletePricing {
  const all = readObj<Record<string, AthletePricing>>('mmo:pricing', {})
  return { ...PRICING_DEFAULT, ...(all[athleteId] ?? {}) }
}

export function setPricing(athleteId: string, patch: Partial<AthletePricing>) {
  const all = readObj<Record<string, AthletePricing>>('mmo:pricing', {})
  all[athleteId] = { ...PRICING_DEFAULT, ...(all[athleteId] ?? {}), ...patch }
  writeObj('mmo:pricing', all)
}

// ── Subscription tiers + paywalled content (OnlyFans-style) ───────────────────
// Athletes define their own content subscription tiers. Fans must hold a
// subscription to see an athlete's posts ("behind the scenes"); until then the
// posts are shown locked. Demo subscriptions are instant + per-browser.
export interface SubscriptionTier {
  id: string
  name: string
  price: number       // USD / month
  perks: string[]
}

const TIERS_KEY = 'mmo:subtiers'        // Record<athleteId, SubscriptionTier[]>
const SUBS_KEY  = 'mmo:subscriptions'   // Record<athleteId, { tierId: string; since: string }>

/** Default two-tier ladder seeded from the athlete's base subscription price. */
function defaultTiers(athleteId: string): SubscriptionTier[] {
  const base = getPricing(athleteId).subscription
  return [
    {
      id: 'tier_inner', name: 'Inner Circle', price: base,
      perks: ['All behind-the-scenes posts', 'Subscriber-only photos & videos', 'Monthly fan Q&A'],
    },
    {
      id: 'tier_vip', name: 'VIP', price: Math.max(Math.round(base * 3), base + 10),
      perks: ['Everything in Inner Circle', 'Early access to new drops', 'Priority replies in chat'],
    },
  ]
}

export function listTiers(athleteId: string): SubscriptionTier[] {
  const all = readObj<Record<string, SubscriptionTier[]>>(TIERS_KEY, {})
  const t = all[athleteId]
  return t && t.length ? t : defaultTiers(athleteId)
}
function writeTiers(athleteId: string, tiers: SubscriptionTier[]) {
  const all = readObj<Record<string, SubscriptionTier[]>>(TIERS_KEY, {})
  all[athleteId] = tiers
  writeObj(TIERS_KEY, all)
}
export function addTier(athleteId: string): SubscriptionTier {
  const t: SubscriptionTier = { id: uid('tier'), name: 'New tier', price: 19, perks: ['Subscriber-only posts'] }
  writeTiers(athleteId, [...listTiers(athleteId), t])
  return t
}
export function updateTier(athleteId: string, id: string, patch: Partial<SubscriptionTier>) {
  writeTiers(athleteId, listTiers(athleteId).map(t => (t.id === id ? { ...t, ...patch } : t)))
}
export function deleteTier(athleteId: string, id: string) {
  const remaining = listTiers(athleteId).filter(t => t.id !== id)
  writeTiers(athleteId, remaining.length ? remaining : defaultTiers(athleteId))
}

export function subscribedTierId(athleteId: string): string | null {
  const all = readObj<Record<string, { tierId: string; since: string }>>(SUBS_KEY, {})
  return all[athleteId]?.tierId ?? null
}
export function isSubscribed(athleteId: string): boolean {
  return subscribedTierId(athleteId) !== null
}
export function subscribe(athleteId: string, tierId: string) {
  const all = readObj<Record<string, { tierId: string; since: string }>>(SUBS_KEY, {})
  all[athleteId] = { tierId, since: new Date().toISOString() }
  writeObj(SUBS_KEY, all)
  trackEvent('subscribed', { athleteId, tierId })
}
export function unsubscribe(athleteId: string) {
  const all = readObj<Record<string, { tierId: string; since: string }>>(SUBS_KEY, {})
  delete all[athleteId]
  writeObj(SUBS_KEY, all)
  trackEvent('unsubscribed', { athleteId })
}

// ── Deterministic demo seeding ────────────────────────────────────────────────
// Populates an athlete with realistic dummy content/courses/availability/pricing
// the first time they're opened, so every screen looks "live" for the demo.
export function isSeeded(athleteId: string): boolean {
  return readArr<string>('mmo:seeded').includes(athleteId)
}

export function seedAthlete(
  athleteId: string,
  data: {
    posts: AthletePost[]; courses: Course[]; slots: AvailabilitySlot[]
    appearances: Appearance[]; pricing: AthletePricing
  },
) {
  if (isSeeded(athleteId)) return
  if (data.posts.length)
    localStorage.setItem('mmo:posts', JSON.stringify([...data.posts, ...readArr<AthletePost>('mmo:posts')]))
  if (data.courses.length)
    localStorage.setItem('mmo:courses', JSON.stringify([...data.courses, ...readArr<Course>('mmo:courses')]))
  if (data.slots.length)
    localStorage.setItem('mmo:availability', JSON.stringify([...data.slots, ...readArr<AvailabilitySlot>('mmo:availability')]))
  if (data.appearances.length)
    localStorage.setItem('mmo:appearances', JSON.stringify([...data.appearances, ...readArr<Appearance>('mmo:appearances')]))

  const allPricing = readObj<Record<string, AthletePricing>>('mmo:pricing', {})
  allPricing[athleteId] = data.pricing
  localStorage.setItem('mmo:pricing', JSON.stringify(allPricing))

  localStorage.setItem('mmo:seeded', JSON.stringify([...readArr<string>('mmo:seeded'), athleteId]))
  emit()
}

// ── Course access (paywall) ───────────────────────────────────────────────────
export function isCourseUnlocked(courseId: string): boolean {
  return readArr<string>('mmo:unlocked').includes(courseId)
}
export function unlockCourse(courseId: string) {
  if (isCourseUnlocked(courseId)) return
  writeArr('mmo:unlocked', [...readArr<string>('mmo:unlocked'), courseId])
}
export function unlockAll(athleteId: string) {
  const courses = listCourses(athleteId)
  const current = readArr<string>('mmo:unlocked')
  const toAdd = courses.map(c => c.id).filter(id => !current.includes(id))
  if (toAdd.length) writeArr('mmo:unlocked', [...current, ...toAdd])
  // also grant subscription if not already subscribed
  if (!isSubscribed(athleteId)) subscribe(athleteId, 'tier_inner')
}

// ── Appearances (customisable, "open to discuss") ─────────────────────────────
export interface Appearance {
  id: string
  athleteId: string
  type: string
  priceMode: 'from' | 'on_request'
  price?: number
  details: string
  active: boolean
  calendlyUrl?: string   // if set, "Book via Calendly" button is shown to fans
}

export function listAppearances(athleteId: string): Appearance[] {
  return readArr<Appearance>('mmo:appearances').filter(a => a.athleteId === athleteId)
}
export function addAppearance(input: Omit<Appearance, 'id'>): Appearance {
  const ap: Appearance = { ...input, id: uid('appr') }
  writeArr('mmo:appearances', [...readArr<Appearance>('mmo:appearances'), ap])
  return ap
}
export function updateAppearance(id: string, patch: Partial<Appearance>) {
  writeArr('mmo:appearances', readArr<Appearance>('mmo:appearances').map(a => (a.id === id ? { ...a, ...patch } : a)))
}
export function deleteAppearance(id: string) {
  writeArr('mmo:appearances', readArr<Appearance>('mmo:appearances').filter(a => a.id !== id))
}

// ── Chat threads (reused by offer negotiation + course drill feedback) ────────
export type ThreadRole = 'athlete' | 'sponsor' | 'fan' | 'system'
export interface Message {
  id: string
  threadId: string
  role: ThreadRole
  text: string
  ts: string
}

export function listMessages(threadId: string): Message[] {
  return readArr<Message>('mmo:messages')
    .filter(m => m.threadId === threadId)
    .sort((a, b) => a.ts.localeCompare(b.ts))
}
export function addMessage(threadId: string, role: ThreadRole, text: string): Message {
  const m: Message = { id: uid('msg'), threadId, role, text, ts: new Date().toISOString() }
  writeArr('mmo:messages', [...readArr<Message>('mmo:messages'), m])
  return m
}
export function threadCount(threadId: string): number {
  return readArr<Message>('mmo:messages').filter(m => m.threadId === threadId).length
}
