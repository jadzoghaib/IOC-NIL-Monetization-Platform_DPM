/**
 * seed.ts — deterministic demo data. The first time an athlete is opened in any
 * mode we populate realistic dummy posts, courses, availability, and pricing,
 * scaled by how famous they are (stars / pageviews / medals). Same athlete →
 * same data every time (seeded RNG), so the demo is stable.
 */
import {
  seedAthlete, isSeeded, clearAthleteData, uid,
  listAppearances, addAppearance, listCourses, addCourse,
  AVAILABILITY_ACTIVITIES,
  type AthletePost, type Course, type AvailabilitySlot, type AthletePricing, type PostKind, type Appearance,
} from './store'

export interface SeedAthlete {
  id: string
  name: string
  sport?: string
  country?: string
  thumbnail?: string
  stars?: number
  pageviews_60d?: number
  is_medalist?: boolean
  medal_totals?: { gold: number; silver: number; bronze: number }
}

// Stable [0,1) hash RNG.
function rng(seed: string, salt: string): number {
  let h = 2166136261
  const s = `${seed}:${salt}`
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000
}

/** Fame score in [0,1] from real data we have. */
function levelOf(a: SeedAthlete): number {
  const pv = a.pageviews_60d ?? 0
  const gold = a.medal_totals?.gold ?? 0
  const reach = Math.min(1, Math.log10(Math.max(pv, 10)) / 7)
  const fame = a.is_medalist ? (gold > 0 ? 0.2 : 0.12) : 0.04
  return Math.min(1, reach * 0.5 + ((a.stars ?? 3) / 5) * 0.3 + fame)
}

const SPONSOR_BRANDS = ['Nike', 'Red Bull', 'Omega', 'Samsung', 'Toyota', 'Visa']
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

function pricingFor(L: number): AthletePricing {
  const r = (lo: number, hi: number) => Math.round(lo + L * (hi - lo))
  return {
    subscription:  r(5, 50),
    socialPost:    r(200, 15000),
    appearance:    r(1000, 50000),
    ambassador:    r(2500, 120000),
    courseDefault: r(19, 199),
  }
}

function buildPosts(a: SeedAthlete, L: number): AthletePost[] {
  const first = a.name.split(' ')[0]
  const sport = a.sport || 'training'
  const tag = (a.sport || 'Olympics').replace(/\s+/g, '')
  const pool: { kind: PostKind; caption: string; mediaUrl?: string; sponsored?: boolean }[] = [
    { kind: 'text',  caption: `Another session in the books. The work never stops. 💪 #${tag}` },
    { kind: 'photo', caption: `Where it all started ✨ Dreams → discipline → here.`, mediaUrl: a.thumbnail },
    { kind: 'text',  caption: `Grateful for every message this week — this community means everything. 🙏` },
    { kind: 'video', caption: `Breaking down my ${sport} technique in slow-mo. Save this one. 🎬` },
    { kind: 'text',  caption: `Inner Circle Q&A this Friday — drop your questions below 👇` },
    { kind: 'photo', caption: `Recovery day done right. Ice, mobility, and way too much coffee. ☕❄️`, mediaUrl: a.thumbnail },
    { kind: 'text',  caption: `Proud to team up with my partners on something special. More soon. 🤝`, sponsored: true },
  ]
  const count = 3 + Math.floor(rng(a.id, 'postcount') * 2) // 3–4
  return pool.slice(0, count).map((p, i) => ({
    id: uid('post'),
    athleteId: a.id,
    kind: p.mediaUrl ? p.kind : (p.kind === 'photo' ? 'text' : p.kind),
    caption: p.caption,
    mediaUrl: p.mediaUrl,
    sponsoredBy: p.sponsored && L > 0.5 ? SPONSOR_BRANDS[Math.floor(rng(a.id, 'brand') * SPONSOR_BRANDS.length)] : undefined,
    likes: Math.round((40 + L * 38000) * (0.5 + rng(a.id, `likes${i}`))),
    createdAt: daysAgo(i * 3 + Math.floor(rng(a.id, `age${i}`) * 2)),
  }))
}

function buildCourses(a: SeedAthlete, L: number, price: number): Course[] {
  const first = a.name.split(' ')[0]
  const sport = a.sport || 'Performance'
  const standard: Omit<Course, 'id' | 'athleteId' | 'createdAt'>[] = [
    {
      title: `${sport} Fundamentals with ${first}`,
      description: `Master the basics of ${sport} — stance, technique, and the mindset that took me to the Olympics.`,
      price, level: 'Beginner', format: 'standard',
      lessons: [
        { title: 'Welcome & your gear', duration: '6 min' },
        { title: 'Core technique breakdown', duration: '18 min' },
        { title: 'Drills you can do at home', duration: '14 min' },
      ],
    },
    {
      title: `Compete Under Pressure`,
      description: `The mental game — how I handle nerves, reset after mistakes, and peak on the biggest stage.`,
      price: Math.round(price * 1.6), level: 'Intermediate', format: 'standard',
      lessons: [
        { title: 'Pre-competition routine', duration: '11 min' },
        { title: 'Resetting after a mistake', duration: '9 min' },
        { title: 'Visualization that works', duration: '13 min' },
      ],
    },
  ]
  const coaching: Omit<Course, 'id' | 'athleteId' | 'createdAt'> = {
    title: `1:1 Video Coaching with ${first}`,
    description: `Send me your training clips and I'll send back a personalised plan with frame-by-frame notes. Limited spots each month.`,
    price: 0, level: 'Advanced', format: 'coaching', coachingPrice: Math.round(price * 2.6), lessons: [],
  }
  const out = [...standard.slice(0, L > 0.45 ? 2 : 1), coaching]
  return out.map((c, i) => ({ ...c, id: uid('course'), athleteId: a.id, createdAt: daysAgo(10 + i * 5) }))
}

function buildAppearances(a: SeedAthlete, L: number): Appearance[] {
  const r = (lo: number, hi: number) => Math.round(lo + L * (hi - lo))
  const defs: Omit<Appearance, 'id' | 'athleteId' | 'active'>[] = [
    { type: 'Grassroots club visit', priceMode: 'on_request', details: "Happy to support local clubs — a training drop-in, photos, and a Q&A with your members. Let's talk." },
    { type: 'Coaching clinic / camp', priceMode: 'from', price: r(300, 6000), details: 'Half-day skills clinic for your squad — drills, technique work, and a talk.' },
    { type: 'School / community talk', priceMode: 'on_request', details: 'An inspiration session and Q&A for students or a community group.' },
    { type: 'Corporate / brand appearance', priceMode: 'from', price: r(2000, 40000), details: 'Keynote, panel, meet-and-greet, or brand activation.' },
  ]
  return defs.map(d => ({ ...d, id: uid('appr'), athleteId: a.id, active: true }))
}

function buildSlots(a: SeedAthlete): AvailabilitySlot[] {
  const count = 4 + Math.floor(rng(a.id, 'slotcount') * 2) // 4–5
  return Array.from({ length: count }, (_, i) => ({
    id: uid('slot'),
    athleteId: a.id,
    date: daysAhead(i * 4 + 3),
    activity: AVAILABILITY_ACTIVITIES[i % AVAILABILITY_ACTIVITIES.length],
    note: undefined,
    booked: rng(a.id, `booked${i}`) < 0.3,
  }))
}

/**
 * Idempotent. Seeds an athlete the first time they're opened, and tops up any
 * features added after they were first seeded (appearances, 1:1 coaching course)
 * so existing demo data isn't stuck on an old shape.
 */
export function ensureSeeded(a: SeedAthlete) {
  if (!a.id) return
  if (a.id === 'caeleb_dressel') {
    ensureDressel(a)
    return
  }
  const L = levelOf(a)
  const pricing = pricingFor(L)
  if (!isSeeded(a.id)) {
    seedAthlete(a.id, {
      posts: buildPosts(a, L),
      courses: buildCourses(a, L, pricing.courseDefault),
      slots: buildSlots(a),
      appearances: buildAppearances(a, L),
      pricing,
    })
  }
  topUp(a, L, pricing.courseDefault)
}

function ensureDressel(a: SeedAthlete) {
  if (isSeeded(a.id)) {
    // Detect stale seed (pre-v2): missing Calendly URLs or YouTube videoIds
    const appr = listAppearances(a.id)
    const crs  = listCourses(a.id)
    const hasCalendly = appr.some(ap => ap.calendlyUrl)
    const hasVideo    = crs.some(c => c.lessons.some(l => l.videoId))
    if (hasCalendly && hasVideo) return  // already up-to-date
    clearAthleteData(a.id)              // purge stale data and fall through to full re-seed
  }

  const pricing: AthletePricing = {
    subscription: 19, socialPost: 5000, appearance: 15000, ambassador: 45000, courseDefault: 79,
  }

  const posts: AthletePost[] = [
    // 3 public preview posts — visible without subscribing
    {
      id: uid('post'), athleteId: a.id, kind: 'photo', public: true,
      caption: '7 medals across two Olympics. Never stops feeling surreal. Grateful for every lap, every team-mate, every fan who showed up. 🇺🇸🏊',
      mediaUrl: a.thumbnail, likes: 94200,
      createdAt: daysAgo(2),
    },
    {
      id: uid('post'), athleteId: a.id, kind: 'text', public: true,
      caption: 'First day back in the water post-break. Slow. Honest. Necessary. Growth doesn\'t come from comfort. 💪 #Training',
      likes: 51800, createdAt: daysAgo(6),
    },
    {
      id: uid('post'), athleteId: a.id, kind: 'video', public: true,
      caption: 'Breaking down my underwater dolphin kick in slow-mo — the phase that separates good from great. Watch closely. 🎬 #SwimTips',
      likes: 38600, createdAt: daysAgo(12),
    },
    // 4 subscription-locked posts
    {
      id: uid('post'), athleteId: a.id, kind: 'text',
      caption: 'The mental side of racing nobody talks about: what I do the 60 seconds before I step on the block. Full breakdown inside 👇 #InnerCircle',
      likes: 27400, createdAt: daysAgo(18),
    },
    {
      id: uid('post'), athleteId: a.id, kind: 'photo',
      caption: 'Behind the scenes: my strength programme this off-season. Numbers, sets, and exactly how I structure my week. 📋💪',
      mediaUrl: a.thumbnail, likes: 19700, createdAt: daysAgo(25),
    },
    {
      id: uid('post'), athleteId: a.id, kind: 'text',
      caption: 'Sponsor deal breakdown — what I look for in a partner and what I\'ve turned down. Unfiltered. 🤝',
      likes: 15200, createdAt: daysAgo(33),
    },
    {
      id: uid('post'), athleteId: a.id, kind: 'video', sponsoredBy: 'Speedo',
      caption: 'With Speedo since day one — the gear, the relationship, what it actually looks like behind the partnership. #Speedo',
      likes: 22500, createdAt: daysAgo(40),
    },
  ]

  const courses: Course[] = [
    {
      id: uid('course'), athleteId: a.id,
      title: 'Swimming Technique Masterclass',
      description: 'The exact underwater mechanics that powered 7 Olympic medals — broken down stroke by stroke, start to finish.',
      price: pricing.courseDefault, level: 'Intermediate', format: 'standard',
      lessons: [
        { title: 'The Underwater Phase That Wins Races', duration: '14 min', videoId: '07CFoLlajmU', playlistId: 'PLZlsU_lxGy65MWskUjNo1niEywlHO4LWh' },
        { title: 'Race-start mechanics & reaction time', duration: '11 min' },
        { title: 'Stroke rate vs. distance-per-stroke', duration: '13 min' },
        { title: 'Turn & breakout optimisation', duration: '10 min' },
      ],
      createdAt: daysAgo(20),
    },
    {
      id: uid('course'), athleteId: a.id,
      title: 'Strength & Conditioning for Swimmers',
      description: 'The full gym programme behind elite swim power — explosive starts, shoulder stability, and injury prevention.',
      price: pricing.courseDefault, level: 'Advanced', format: 'standard',
      lessons: [
        { title: 'Full Body Power for Explosive Starts', duration: '18 min', videoId: '7xhOfvq3u70', playlistId: 'PLZlsU_lxGy65kR0NYvTelcoTiUtiTuz_c' },
        { title: 'Shoulder stability & longevity', duration: '16 min' },
        { title: 'Weekly programme structure', duration: '12 min' },
        { title: 'Recovery & load management', duration: '9 min' },
      ],
      createdAt: daysAgo(25),
    },
    {
      id: uid('course'), athleteId: a.id,
      title: '1:1 Video Coaching with Caeleb',
      description: 'Send me a 90-second clip of your stroke or start. I\'ll return a frame-by-frame personal breakdown with a 4-week training plan. Limited to 10 athletes per month.',
      price: 0, level: 'Advanced', format: 'coaching', coachingPrice: 199,
      lessons: [],
      createdAt: daysAgo(30),
    },
  ]

  const slots: AvailabilitySlot[] = [
    { id: uid('slot'), athleteId: a.id, date: daysAhead(5),  activity: 'Sponsored Post',   booked: false },
    { id: uid('slot'), athleteId: a.id, date: daysAhead(9),  activity: 'Content Shoot',    booked: false },
    { id: uid('slot'), athleteId: a.id, date: daysAhead(14), activity: 'Live Appearance',  booked: true  },
    { id: uid('slot'), athleteId: a.id, date: daysAhead(21), activity: 'Brand Collab Day', booked: false },
    { id: uid('slot'), athleteId: a.id, date: daysAhead(28), activity: 'Q&A / Livestream', booked: false },
  ]

  const appearances: Appearance[] = [
    {
      id: uid('appr'), athleteId: a.id, active: true,
      type: 'Brand Partnership / Ambassador',
      priceMode: 'from', price: 45000,
      details: 'Long-form partnerships only — product alignment matters. Open to apparel, nutrition, and wellness brands.',
      calendlyUrl: 'https://www.caelebdressel.com/',
    },
    {
      id: uid('appr'), athleteId: a.id, active: true,
      type: 'Corporate keynote / panel',
      priceMode: 'from', price: 15000,
      details: 'Performance mindset, resilience under pressure, elite preparation. Perfect for leadership events.',
      calendlyUrl: 'https://www.caelebdressel.com/',
    },
    {
      id: uid('appr'), athleteId: a.id, active: true,
      type: 'Swimming clinic / masterclass',
      priceMode: 'from', price: 3000,
      details: 'Half-day technical clinic — stroke mechanics, starts, and race strategy for serious competitive swimmers.',
      calendlyUrl: 'https://www.caelebdressel.com/',
    },
    {
      id: uid('appr'), athleteId: a.id, active: true,
      type: 'School / community visit',
      priceMode: 'on_request',
      details: 'Inspiration talks, Q&A sessions, and youth swim demonstrations. Reach out to discuss.',
      calendlyUrl: 'https://www.caelebdressel.com/',
    },
  ]

  seedAthlete(a.id, { posts, courses, slots, appearances, pricing })
  topUpDressel(a)
}

function topUpDressel(a: SeedAthlete) {
  if (listAppearances(a.id).length === 0) {
    const appearances: Omit<Appearance, 'id'>[] = [
      {
        athleteId: a.id, active: true, type: 'Brand Partnership / Ambassador',
        priceMode: 'from', price: 45000,
        details: 'Long-form partnerships only — product alignment matters.',
        calendlyUrl: 'https://www.caelebdressel.com/',
      },
    ]
    appearances.forEach(ap => addAppearance(ap))
  }
  const courses = listCourses(a.id)
  if (!courses.some(c => c.format === 'coaching')) {
    addCourse({
      athleteId: a.id, title: '1:1 Video Coaching with Caeleb',
      description: 'Send me a 90-second clip of your stroke or start. I\'ll return a frame-by-frame breakdown with a 4-week training plan.',
      price: 0, level: 'Advanced', format: 'coaching', coachingPrice: 199, lessons: [],
    })
  }
}

/** Add features that may not exist for athletes seeded under an older version. */
function topUp(a: SeedAthlete, L: number, coursePrice: number) {
  if (listAppearances(a.id).length === 0) {
    buildAppearances(a, L).forEach(ap =>
      addAppearance({ athleteId: a.id, type: ap.type, priceMode: ap.priceMode, price: ap.price, details: ap.details, active: ap.active }))
  }
  const courses = listCourses(a.id)
  if (!courses.some(c => (c.format ?? 'standard') === 'coaching')) {
    const first = a.name.split(' ')[0]
    addCourse({
      athleteId: a.id,
      title: `1:1 Video Coaching with ${first}`,
      description: `Send me your training clips and I'll send back a personalised plan with frame-by-frame notes. Limited spots each month.`,
      price: 0, level: 'Advanced', format: 'coaching', coachingPrice: Math.round(coursePrice * 2.6), lessons: [],
    })
  }
}
