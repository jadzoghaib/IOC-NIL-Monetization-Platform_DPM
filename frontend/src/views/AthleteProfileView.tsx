import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { useFollows } from '../hooks/useFollows'
import { ATHLETES } from '../data/athletes'
import { ARCHETYPES, getArchetypeKey } from '../data/archetypes'
import { useAthleteNews } from '../hooks/useAthleteNews'
import { api } from '../lib/api'
import type { AthleteRecord } from '../lib/api'
import FollowButton from '../components/FollowButton'
import NewsCard, { NewsFeedSkeleton } from '../components/NewsCard'
import OfferingCard, { PortfolioOfferingCard } from '../components/OfferingCard'
import { getPortfolio } from '../data/offerings'
import StarRating from '../components/StarRating'
import MedalDots from '../components/MedalDots'
import { sportPictogramUrl, flagImageUrl } from '../lib/sportIcons'
import {
  useStoreVersion, listSlots, getPricing,
  listCourses, isCourseUnlocked, unlockCourse, unlockAll, listAppearances,
  listPosts, listTiers, isSubscribed, subscribe, unsubscribe,
  type Course, type AthletePost, type SubscriptionTier,
} from '../lib/store'
import { ensureSeeded } from '../lib/seed'
import { labelFor } from '../lib/athleteLabel'
import ChatThread from '../components/ChatThread'
import {
  Newspaper, RotateCcw, Handshake, Flag, Flame, Crown, Zap, Sparkles, Rocket, Dumbbell, Globe,
  GraduationCap, Video, Lock, CheckCircle2, Camera, PenLine, LockOpen, Star, CalendarDays, MessageCircle,
} from 'lucide-react'

interface Props {
  athleteId: string
  follows: ReturnType<typeof useFollows>
  onBack: () => void
}

interface UnifiedAthlete {
  id: string
  name: string
  flag: string
  country: string
  sport: string
  story?: string
  stars?: number
  is_medalist?: boolean
  medal_totals?: { gold: number; silver: number; bronze: number }
  events?: string[]
  is_flagbearer_open?: boolean
  is_flagbearer_close?: boolean
  thumbnail?: string
  archetype_color?: string
  archetype_emoji?: string
  archetype_name?: string
  wikipedia_url?: string
}

export default function AthleteProfileView({ athleteId, follows, onBack }: Props) {
  const [athlete, setAthlete] = useState<UnifiedAthlete | null>(null)
  const [loadingAthlete, setLoadingAthlete] = useState(true)
  const [offerings, setOfferings] = useState<any[]>([])
  const [aiStory, setAiStory] = useState<string | null>(null)
  const [aiArchetype, setAiArchetype] = useState<string | null>(null)
  const [loadingStory, setLoadingStory] = useState(false)
  const { articles, loading: loadingNews, stale, source, error, refresh: refreshNews } = useAthleteNews(athleteId)
  const isFollowed = follows.isFollowed(athleteId)

  const isLegacy = !!ATHLETES[athleteId]

  /** Fetch (or re-fetch) the AI story. Pass refresh=true to pull fresh news first. */
  const fetchStory = (forceRefresh = false) => {
    if (isLegacy) return
    setLoadingStory(true)
    setAiStory(null)
    setAiArchetype(null)
    const url = `/api/athletes/${athleteId}/story${forceRefresh ? '?refresh=true' : ''}`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setAiStory(d.story || null)
        setAiArchetype(d.archetype || null)
      })
      .catch(() => {})
      .finally(() => setLoadingStory(false))
  }

  /** Refresh button: re-fetch news → backend invalidates story → re-fetch story */
  const handleRefresh = async () => {
    refreshNews()          // triggers POST /api/news/{id}/refresh
    // Small delay so the backend news refresh + story invalidation complete first
    await new Promise(r => setTimeout(r, 1500))
    fetchStory(true)       // re-generates story with fresh news
  }

  useEffect(() => {
    let cancelled = false
    setLoadingAthlete(true)

    // 1) Try legacy 48 first (has archetype + story)
    const legacy = ATHLETES[athleteId]
    if (legacy) {
      const archetypeKey = getArchetypeKey(legacy.archetypeKey[0], legacy.archetypeKey[1])
      const arc = ARCHETYPES[archetypeKey]
      setAthlete({
        id: legacy.id,
        name: legacy.name,
        flag: legacy.flag,
        country: legacy.country,
        sport: legacy.sport,
        story: legacy.story,
        archetype_color: arc?.color,
        archetype_emoji: arc?.emoji,
        archetype_name: arc?.name,
      })
      setLoadingAthlete(false)
    } else {
      // 2) Otherwise fetch from API
      api.getAthlete(athleteId)
        .then((rec: AthleteRecord) => {
          if (cancelled) return
          setAthlete({
            id: rec.id,
            name: rec.name,
            flag: rec.flag || '🏳️',
            country: rec.country || '',
            sport: rec.sport || '',
            stars: rec.stars,
            is_medalist: rec.is_medalist,
            medal_totals: rec.medal_totals,
            events: rec.events,
            is_flagbearer_open: rec.is_flagbearer_open,
            is_flagbearer_close: rec.is_flagbearer_close,
            thumbnail: rec.thumbnail,
            wikipedia_url: rec.wikipedia_url,
          })
        })
        .catch(() => { if (!cancelled) setAthlete(null) })
        .finally(() => { if (!cancelled) setLoadingAthlete(false) })
    }

    // Offerings (works for both legacy and new IDs)
    api.getOfferings(athleteId)
      .then(o => { if (!cancelled) setOfferings(o as any[]) })
      .catch(() => { if (!cancelled) setOfferings([]) })

    // AI story — only for full-database athletes (not legacy 48)
    if (!legacy) {
      fetchStory(false)
    }

    return () => { cancelled = true }
  }, [athleteId])

  // Seed realistic demo content/pricing/availability the first time this athlete is viewed.
  useEffect(() => {
    if (!athlete) return
    ensureSeeded({
      id: athlete.id, name: athlete.name, sport: athlete.sport, country: athlete.country,
      thumbnail: athlete.thumbnail, stars: athlete.stars,
      is_medalist: athlete.is_medalist, medal_totals: athlete.medal_totals,
    })
  }, [athlete])

  if (loadingAthlete) {
    return (
      <div className="text-center py-20 text-white/30">Loading athlete...</div>
    )
  }
  if (!athlete) {
    return (
      <div className="text-center py-20 text-white/30">
        <p>Athlete not found.</p>
        <button onClick={onBack} className="mt-4 text-gold/60 hover:text-gold text-sm transition-colors">← Back</button>
      </div>
    )
  }

  const color = athlete.archetype_color ?? '#FFD700'

  return (
    <motion.div
      key={`profile-${athleteId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
    >
      <button
        onClick={onBack}
        className="mb-6 text-white/40 hover:text-white/80 text-sm transition-colors flex items-center gap-1.5"
      >
        ← Back
      </button>

      {/* Demo bypass banner — Dressel case study only */}
      {athleteId === 'caeleb_dressel' && <DemoBanner athleteId={athleteId} />}

      {/* Hero */}
      <div
        className="relative rounded-3xl p-8 mb-8 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, var(--bg-card) 100%)`,
          border: `1px solid ${color}35`,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />

        <div
          className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none overflow-hidden"
          aria-hidden
        >
          <span
            className="font-display select-none"
            style={{
              fontSize: 'clamp(5rem, 18vw, 14rem)',
              color: `${color}08`,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.02em',
            }}
          >
            {athlete.name.split(' ').pop()?.toUpperCase()}
          </span>
        </div>

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            {athlete.thumbnail ? (
              <img
                src={athlete.thumbnail}
                alt={athlete.name}
                className="w-24 h-24 rounded-xl object-cover mb-3 border border-white/15"
              />
            ) : (
              /* Real flag image, fall back to emoji on error */
              (() => {
                const flagUrl = flagImageUrl(athlete.flag, 80)
                return flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={athlete.country}
                    className="w-16 h-auto rounded mb-3 border border-white/10"
                    onError={e => {
                      const t = e.currentTarget
                      t.style.display = 'none'
                      const span = document.createElement('span')
                      span.textContent = athlete.flag
                      span.className = 'text-6xl block mb-3'
                      t.parentNode?.insertBefore(span, t)
                    }}
                  />
                ) : (
                  <span className="text-6xl block mb-3">{athlete.flag}</span>
                )
              })()
            )}
            <h1
              className="font-display leading-none mb-2"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', color }}
            >
              {athlete.name.toUpperCase()}
            </h1>
            <p className="text-base text-white/50 mb-3 flex items-center gap-2">
              <span>{athlete.country}</span>
              {athlete.country && athlete.sport && <span className="text-white/30">·</span>}
              {athlete.sport && (() => {
                const picUrl = sportPictogramUrl(athlete.sport)
                return (
                  <span className="flex items-center gap-1.5">
                    {picUrl
                      ? <img src={picUrl} alt="" width={14} height={14} className="sport-pictogram" style={{ opacity: 0.6 }} />
                      : null}
                    <span>{athlete.sport}</span>
                  </span>
                )
              })()}
            </p>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Fan archetype label (derived from data) */}
              {(() => {
                const lbl = labelFor({
                  is_medalist: athlete.is_medalist, medal_totals: athlete.medal_totals, stars: athlete.stars,
                  is_flagbearer_open: athlete.is_flagbearer_open, is_flagbearer_close: athlete.is_flagbearer_close,
                  country: athlete.country,
                })
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: `${lbl.color}1F`, color: lbl.color, border: `1px solid ${lbl.color}40` }}
                    title={lbl.blurb}>
                    {lbl.emoji} {lbl.label}
                  </span>
                )
              })()}
              {/* Legacy archetype badge (hardcoded 48 athletes) */}
              {athlete.archetype_name && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: `${color}18`, color }}
                >
                  {athlete.archetype_emoji} {athlete.archetype_name}
                </motion.div>
              )}
              {/* AI-detected archetype badge (full-database athletes) */}
              {!athlete.archetype_name && aiArchetype && (() => {
                const ARCHETYPE_LABELS: Record<string, { label: string; icon: ReactNode }> = {
                  comeback:       { label: 'The Comeback',            icon: <Flame size={12} color="#EE334E" /> },
                  legend_finale:  { label: "The Legend's Last Stand", icon: <Crown size={12} color="#FFD700" /> },
                  dominant_force: { label: 'The Unstoppable',         icon: <Zap size={12} color="#FCB131" /> },
                  rising_star:    { label: 'The Arrival',             icon: <Sparkles size={12} color="#FCB131" /> },
                  pioneer:        { label: 'The First',               icon: <Rocket size={12} color="#A78BFA" /> },
                  underdog:       { label: 'The Defier',              icon: <Dumbbell size={12} color="#38BDF8" /> },
                  ambassador:     { label: 'The Mission',             icon: <Globe size={12} color="#FB923C" /> },
                }
                const arc = ARCHETYPE_LABELS[aiArchetype]
                return arc ? (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: `${color}18`, color }}
                  >
                    {arc.icon} {arc.label}
                  </motion.div>
                ) : null
              })()}

              {/* Medal circles — show individual discs for each medal */}
              {athlete.medal_totals && (athlete.medal_totals.gold + athlete.medal_totals.silver + athlete.medal_totals.bronze) > 0 ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10">
                  <MedalDots
                    gold={athlete.medal_totals.gold}
                    silver={athlete.medal_totals.silver}
                    bronze={athlete.medal_totals.bronze}
                    size="sm"
                    showLabels
                  />
                </span>
              ) : athlete.is_medalist ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gold/15 text-gold">
                  <MedalDots gold={1} silver={0} bronze={0} size="xs" hideCount /> Medalist
                </span>
              ) : null}

              {(athlete.is_flagbearer_open || athlete.is_flagbearer_close) && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-oly-red/15 text-oly-red">
                  <Flag size={12} color="#EE334E" /> Flagbearer
                  {athlete.is_flagbearer_open && athlete.is_flagbearer_close ? ' (Open & Close)'
                    : athlete.is_flagbearer_open ? ' (Opening)'
                    : ' (Closing)'}
                </span>
              )}
              {typeof athlete.stars === 'number' && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/8">
                  <StarRating stars={athlete.stars} size="xs" showNumber />
                </span>
              )}
            </div>
          </div>
          <FollowButton isFollowed={isFollowed} onToggle={() => follows.toggle(athleteId)} />
        </div>

        {/* Legacy story (hardcoded 48 athletes) */}
        {athlete.story && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 mt-5 text-white/60 leading-relaxed max-w-2xl"
          >
            {athlete.story}
          </motion.p>
        )}

        {/* AI-generated story (full-database athletes) */}
        {!athlete.story && (aiStory || loadingStory) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 mt-5 max-w-2xl"
          >
            {loadingStory && !aiStory ? (
              <div className="h-4 bg-white/10 rounded animate-pulse w-3/4 mb-2" />
            ) : aiStory ? (
              <p className="text-white/60 leading-relaxed italic">
                {aiStory}
              </p>
            ) : null}
          </motion.div>
        )}

        {athlete.events && athlete.events.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">
              Competed in
            </p>
            <div className="flex flex-wrap gap-2">
              {athlete.events.slice(0, 8).map((evt, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-xs bg-white/[0.05] border border-white/10 text-white/70"
                >
                  {evt}
                </span>
              ))}
              {athlete.events.length > 8 && (
                <span className="px-2.5 py-1 rounded-md text-xs text-white/30">
                  +{athlete.events.length - 8} more
                </span>
              )}
            </div>
          </motion.div>
        )}

        {athlete.wikipedia_url && (
          <a
            href={athlete.wikipedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mt-3 inline-block text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            View on Wikipedia →
          </a>
        )}
      </div>

      {/* Behind-the-scenes content — locked behind a subscription (OnlyFans-style) */}
      <FanContentSection athleteId={athlete.id} athleteName={athlete.name} accent={color} />

      {/* Two-col: News + Offerings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-white flex items-center gap-2"><Newspaper size={20} style={{ color: 'var(--text-muted)' }} /> LATEST STORIES</h2>
            <div className="flex items-center gap-3">
              {stale && <span className="text-xs text-white/30 italic">cached</span>}
              {source === 'generated' && <span className="text-xs text-white/30 italic">AI-curated</span>}
              {loadingStory && (
                <span className="text-xs text-white/30 italic animate-pulse">updating bio…</span>
              )}
              <button
                onClick={handleRefresh}
                disabled={loadingStory || loadingNews}
                className="text-xs text-white/30 hover:text-gold transition-colors disabled:opacity-40"
                title="Refresh news + regenerate bio"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {loadingNews && <NewsFeedSkeleton />}

          {!loadingNews && error && (
            <div className="rounded-xl border border-white/8 p-5 text-center">
              <p className="text-white/30 text-sm mb-2">Couldn't load news right now</p>
              <button onClick={refreshNews} className="text-gold/60 hover:text-gold text-xs transition-colors">Try again</button>
            </div>
          )}

          {!loadingNews && !error && articles.length === 0 && (
            <div className="rounded-xl border border-white/8 p-5 text-center">
              <p className="text-white/30 text-sm">No personal stories found yet.</p>
              <p className="text-white/20 text-xs mt-1">We look for interviews, comeback stories, and personal journeys.</p>
            </div>
          )}

          {!loadingNews && articles.length > 0 && (
            <div className="space-y-3">
              {articles.map((article, i) => (
                <NewsCard key={article.url} article={article} index={i} />
              ))}
            </div>
          )}
        </div>

        <div>
          {/* Portfolio header */}
          <div className="mb-5">
            <h2 className="font-display text-2xl text-white mb-1 flex items-center gap-2">
              <Handshake size={20} style={{ color: 'var(--text-muted)' }} /> WORK WITH {athlete.name.split(' ')[0].toUpperCase()}
            </h2>
            <p className="text-xs text-white/35">
              Book {athlete.name.split(' ')[0]} for appearances, events, and experiences
            </p>
          </div>

          {/* Portfolio grid — 2 columns on wider screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {getPortfolio(athlete.name.split(' ')[0]).map((o, i) => (
              <PortfolioOfferingCard key={o.id} offering={o} index={i} />
            ))}
          </div>

          {/* Courses & coaching (paywalled) */}
          <FanCoursesSection athleteId={athlete.id} athleteName={athlete.name} />

          {/* Booking: subscription + appearances + open dates */}
          <FanAvailabilityCard athleteId={athlete.id} athleteName={athlete.name} />

          {/* Divider */}
          <div className="border-t border-white/[0.06] pt-4 mb-4">
            <p className="text-xs text-white/25 text-center">
              All bookings are handled directly with {athlete.name.split(' ')[0]}'s management team
            </p>
          </div>

          {!isFollowed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl p-5 border border-gold/20 bg-gold/[0.04] text-center"
            >
              <p className="text-white/50 text-sm mb-3">
                Follow {athlete.name.split(' ')[0]} to get their stories in your feed
              </p>
              <FollowButton isFollowed={false} onToggle={() => follows.toggle(athleteId)} />
            </motion.div>
          )}

          {isFollowed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-4 border border-gold/15 bg-gold/[0.03] text-center"
            >
              <p className="text-gold/60 text-xs">✓ In your feed</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const fanMoney = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`)

// ── Courses & coaching (fan-facing, paywalled) ────────────────────────────────
function FanCoursesSection({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  useStoreVersion()
  const courses = listCourses(athleteId)
  const [active, setActive] = useState<Course | null>(null)
  if (courses.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl text-white mb-1 flex items-center gap-2"><GraduationCap size={20} color="#FFD700" /> TRAIN WITH {athleteName.split(' ')[0].toUpperCase()}</h2>
      <p className="text-xs text-white/35 mb-4">Courses, drills, and 1:1 video coaching — tap to open.</p>
      <div className="space-y-2.5">
        {courses.map(c => {
          const coaching = (c.format ?? 'standard') === 'coaching'
          const unlocked = isCourseUnlocked(c.id)
          const price = coaching ? (c.coachingPrice ?? 99) : c.price
          const accent = coaching ? '#2A9D8F' : '#FFD700'
          return (
            <button key={c.id} onClick={() => setActive(c)}
              className="w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-colors hover:bg-white/[0.03]"
              style={{ borderColor: `${accent}25`, background: `${accent}08` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${accent}1A`, border: `1px solid ${accent}30` }}>
                {coaching ? <Video size={18} style={{ color: accent }} /> : unlocked ? <CheckCircle2 size={18} color="#22C55E" /> : <Lock size={18} style={{ color: 'var(--text-faint)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{c.title}</div>
                <div className="text-white/40 text-xs">
                  {coaching ? '1:1 Video Coaching' : `${c.lessons.length} lessons · ${c.level}`}
                  {!coaching && unlocked && ' · unlocked'}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-sm" style={{ color: accent }}>{fanMoney(price)}</div>
                <div className="text-white/30 text-[10px]">{coaching ? 'per plan' : unlocked ? 'owned' : 'unlock'}</div>
              </div>
            </button>
          )
        })}
      </div>
      <AnimatePresence>
        {active && <FanCourseModal course={active} athleteName={athleteName} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  )
}

function FanCourseModal({ course: c, athleteName, onClose }: { course: Course; athleteName: string; onClose: () => void }) {
  useStoreVersion()
  const coaching = (c.format ?? 'standard') === 'coaching'
  const unlocked = isCourseUnlocked(c.id)
  const accent = coaching ? '#2A9D8F' : '#FFD700'
  const price = coaching ? (c.coachingPrice ?? 99) : c.price
  const first = athleteName.split(' ')[0]
  const [openLesson, setOpenLesson] = useState<number | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl p-6 max-h-[88vh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', border: `1px solid ${accent}40` }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>
              {coaching ? <span className="inline-flex items-center gap-1"><Video size={11} />1:1 Video Coaching</span> : `▶ Course · ${c.level}`}
            </div>
            <h3 className="font-display text-2xl text-white tracking-wide leading-none">{c.title}</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg">✕</button>
        </div>
        <p className="text-white/55 text-sm leading-relaxed mb-4">{c.description}</p>

        {coaching ? (
          <>
            <div className="rounded-xl p-3 mb-4 text-sm text-white/60" style={{ background: `${accent}0D`, border: `1px solid ${accent}22` }}>
              Get a personalised plan from {first}. Pay once, send your training clips below, and {first} replies with frame-by-frame feedback.
            </div>
            {!unlocked ? (
              <PaywallButton accent={accent} label={`Book coaching · ${fanMoney(price)}`} onUnlock={() => unlockCourse(c.id)} />
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-widest text-white/30 mb-2">Send your clips & get feedback</div>
                <ChatThread threadId={`drills:${c.id}`} me="fan" otherName={first} accent={accent}
                  placeholder="Paste a video link or describe your drill…"
                  emptyHint={`Post your training clip — ${first} will review it here.`}
                  quickReplies={["Here's my latest clip:", 'Where should I focus?', 'Can you build me a week plan?']} maxHeight={240} />
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-[11px] uppercase tracking-widest text-white/30 mb-2">{c.lessons.length} lessons</div>
            <div className="space-y-1.5 mb-4">
              {c.lessons.map((l, i) => {
                const canPlay = unlocked && !!l.videoId
                const isOpen = openLesson === i
                return (
                  <div key={i}>
                    <button
                      className="w-full flex items-center justify-between text-sm rounded-lg px-3 py-2 transition-colors"
                      style={{ background: isOpen ? `${accent}18` : 'rgba(255,255,255,0.03)', border: isOpen ? `1px solid ${accent}40` : '1px solid transparent' }}
                      onClick={() => canPlay && setOpenLesson(isOpen ? null : i)}
                    >
                      <span className="text-white/70 flex items-center gap-2 text-left">
                        <span>{canPlay ? (isOpen ? '⏸' : '▶') : <Lock size={12} style={{ color: 'var(--text-faint)' }} />}</span>
                        <span>{i + 1}. {l.title}</span>
                      </span>
                      <span className="text-white/30 text-xs flex-shrink-0">{l.duration}</span>
                    </button>
                    {isOpen && l.videoId && (
                      <div className="mt-2 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${l.videoId}${l.playlistId ? `?list=${l.playlistId}` : ''}&rel=0&autoplay=1`}
                          title={l.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {!unlocked ? (
              <PaywallButton accent={accent} label={`Unlock all lessons · ${fanMoney(price)}`} onUnlock={() => unlockCourse(c.id)} />
            ) : (
              <>
                <div className="rounded-xl p-3 mb-4 text-sm text-emerald-300/80" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <CheckCircle2 size={14} className="inline mr-1" color="#22C55E" /> Unlocked — click any lesson above to play it.
                </div>
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/30 mb-2"><MessageCircle size={11} /> Drills & Feedback</div>
                <ChatThread threadId={`drills:${c.id}`} me="fan" otherName={first} accent={accent}
                  placeholder="Post your drill or ask a question…"
                  emptyHint={`Share how your drills are going — ${first} gives feedback here.`}
                  quickReplies={['Just finished lesson 1!', "Here's my attempt:", 'Stuck on this part…']} maxHeight={220} />
              </>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function PaywallButton({ accent, label, onUnlock }: { accent: string; label: string; onUnlock: () => void }) {
  const [busy, setBusy] = useState(false)
  const go = () => { setBusy(true); setTimeout(onUnlock, 550) }
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={go} disabled={busy}
      className="w-full py-3 rounded-xl text-sm font-bold transition-all"
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#0D0D2B' }}>
      {busy ? 'Processing…' : `${label} →`}
    </motion.button>
  )
}

function DemoBanner({ athleteId }: { athleteId: string }) {
  useStoreVersion()
  const subscribed = isSubscribed(athleteId)
  const [done, setDone] = useState(false)
  if (subscribed || done) return null
  const bypass = () => { unlockAll(athleteId); setDone(true) }
  return (
    <div className="mb-5 rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.07] px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-yellow-300 font-bold text-sm mb-0.5">Demo mode</div>
        <div className="text-white/50 text-xs">Skip the paywall to explore Caeleb's full profile — posts, courses, and booking.</div>
      </div>
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={bypass}
        className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold"
        style={{ background: 'linear-gradient(135deg,#FFD700,#F59E0B)', color: '#0A0B0D' }}>
        Unlock all →
      </motion.button>
    </div>
  )
}

// ── Behind-the-scenes content (fan-facing, subscription paywall) ──────────────
function FanContentSection({ athleteId, athleteName, accent }: { athleteId: string; athleteName: string; accent: string }) {
  useStoreVersion()
  const posts = listPosts(athleteId)
  const subscribed = isSubscribed(athleteId)
  const tiers = listTiers(athleteId)
  const first = athleteName.split(' ')[0]
  if (posts.length === 0) return null

  const publicPosts = posts.filter(p => p.public)
  const lockedPosts = posts.filter(p => !p.public)

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-4 gap-3">
        <div>
          <h2 className="font-display text-2xl text-white flex items-center gap-2"><Camera size={20} style={{ color: 'var(--text-muted)' }} /> BEHIND THE SCENES</h2>
          <p className="text-xs text-white/35">
            {lockedPosts.length > 0
              ? `${lockedPosts.length} subscriber-only post${lockedPosts.length !== 1 ? 's' : ''} from ${first}`
              : `Posts from ${first}`}
          </p>
        </div>
        {subscribed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
            style={{ background: `${accent}1F`, color: accent, border: `1px solid ${accent}40` }}>
            ✓ Subscribed
          </span>
        )}
      </div>

      {/* Public posts — always visible */}
      {publicPosts.length > 0 && (
        <div className="space-y-3 mb-5">
          {publicPosts.map(p => <UnlockedPostCard key={p.id} post={p} />)}
        </div>
      )}

      {lockedPosts.length > 0 && (
        subscribed ? (
          <div className="space-y-3">
            {lockedPosts.map(p => <UnlockedPostCard key={p.id} post={p} />)}
            <button onClick={() => unsubscribe(athleteId)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Manage subscription · Cancel
            </button>
          </div>
        ) : (
          <>
            {/* Locked teasers — fans can see that content exists, but not what it says */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {lockedPosts.slice(0, 3).map(p => <LockedPostCard key={p.id} post={p} accent={accent} />)}
            </div>
            <SubscribePanel athleteId={athleteId} first={first} tiers={tiers} accent={accent} count={lockedPosts.length} />
          </>
        )
      )}
    </div>
  )
}

const POST_KIND_META: Record<AthletePost['kind'], { icon: ReactNode; label: string }> = {
  photo: { icon: <Camera size={11} style={{ color: 'var(--accent)' }} />, label: 'Photo' },
  video: { icon: <Video size={11} style={{ color: 'var(--accent)' }} />, label: 'Video' },
  text:  { icon: <PenLine size={11} style={{ color: 'var(--text-muted)' }} />, label: 'Post' },
}

function LockedPostCard({ post, accent }: { post: AthletePost; accent: string }) {
  const meta = POST_KIND_META[post.kind]
  return (
    <div className="relative rounded-2xl overflow-hidden border aspect-[4/3]"
      style={{ borderColor: `${accent}25`, background: `${accent}0A` }}>
      {/* Blurred teaser of the real caption — present but unreadable */}
      <div className="absolute inset-0 p-4 select-none" style={{ filter: 'blur(7px)', opacity: 0.45 }} aria-hidden>
        <div className="text-white/80 text-sm leading-relaxed">{post.caption || 'Subscriber-only content'}</div>
      </div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-3"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55))' }}>
        <Lock size={24} style={{ color: 'var(--text-faint)' }} />
        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>{meta.icon} {meta.label} · Locked</div>
        <div className="text-[10px] text-white/50">Subscribers only</div>
      </div>
    </div>
  )
}

function UnlockedPostCard({ post }: { post: AthletePost }) {
  const relTime = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (m < 60) return `${Math.max(m, 1)}m ago`
    const h = Math.floor(m / 60)
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
  }
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
      {post.sponsoredBy && <div className="flex items-center gap-1.5 text-xs font-bold text-gold tracking-wider mb-1.5"><Sparkles size={11} /> Sponsored · {post.sponsoredBy}</div>}
      <div className="text-xs text-white/35 mb-2">{POST_KIND_META[post.kind].icon} {POST_KIND_META[post.kind].label} · {relTime(post.createdAt)}</div>
      {post.caption && <p className="text-white/85 text-sm leading-relaxed mb-2 whitespace-pre-wrap">{post.caption}</p>}
      {post.mediaUrl && post.kind === 'photo' && (
        <img src={post.mediaUrl} alt="" className="rounded-xl max-h-72 w-full object-cover bg-white/[0.03] mb-2"
          onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
      )}
      {post.mediaUrl && post.kind === 'video' && (
        <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80">▶ Watch video</a>
      )}
      <div className="text-white/35 text-xs mt-1">♥ {post.likes.toLocaleString()}</div>
    </div>
  )
}

function SubscribePanel({ athleteId, first, tiers, accent, count }: {
  athleteId: string; first: string; tiers: SubscriptionTier[]; accent: string; count: number
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const go = (tierId: string) => { setBusy(tierId); setTimeout(() => subscribe(athleteId, tierId), 500) }
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: `${accent}30`, background: `${accent}0A` }}>
      <div className="text-center mb-4">
        <LockOpen size={28} color="#22C55E" className="mx-auto mb-1" />
        <h3 className="font-display text-xl text-white">SUBSCRIBE TO UNLOCK</h3>
        <p className="text-xs text-white/45 mt-1">
          Get all {count} of {first}'s behind-the-scenes posts, photos and videos. Cancel anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiers.map((t, i) => {
          const featured = i === 0
          return (
            <div key={t.id} className="rounded-2xl border p-4 flex flex-col"
              style={{ borderColor: featured ? `${accent}50` : 'rgba(255,255,255,0.1)', background: featured ? `${accent}12` : 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-white font-bold text-sm">{t.name}</span>
                <span className="font-bold" style={{ color: accent }}>
                  ${t.price}<span className="text-white/30 font-normal text-xs"> /mo</span>
                </span>
              </div>
              <ul className="space-y-1 mb-4 flex-1">
                {t.perks.map((p, j) => (
                  <li key={j} className="text-xs text-white/55 flex items-start gap-1.5">
                    <span style={{ color: accent }}>✓</span> {p}
                  </li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => go(t.id)} disabled={!!busy}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                style={featured
                  ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#0A0B0D' }
                  : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-2)' }}>
                {busy === t.id ? 'Processing…' : `Subscribe · $${t.price}/mo`}
              </motion.button>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-white/25 text-center mt-3">Demo checkout — unlocks instantly, stored in your browser.</p>
    </div>
  )
}

// ── Booking card: subscription + customisable appearances + open dates ────────
function FanAvailabilityCard({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  useStoreVersion()
  const pricing = getPricing(athleteId)
  const appearances = listAppearances(athleteId).filter(a => a.active)
  const openSlots = listSlots(athleteId).filter(s => !s.booked).slice(0, 4)
  const first = athleteName.split(' ')[0]
  const prettyDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: 'rgba(255,215,0,0.18)', background: 'rgba(255,215,0,0.03)' }}>
      <h3 className="font-display text-xl text-white mb-3 flex items-center gap-2"><CalendarDays size={18} color="#2A9D8F" /> BOOK {first.toUpperCase()}</h3>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="flex items-center gap-1.5 text-white/55"><Star size={13} color="#FFD700" /> Inner Circle membership</span>
        <span className="text-gold font-bold">{fanMoney(pricing.subscription)} <span className="text-white/30 font-normal text-xs">/ mo</span></span>
      </div>

      {appearances.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-widest text-white/30 mb-2">Appearances</div>
          <div className="space-y-2 mb-4">
            {appearances.map(ap => (
              <div key={ap.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-white/80 text-sm font-semibold">{ap.type}</span>
                  <span className="text-xs font-bold flex-shrink-0"
                    style={{ color: ap.priceMode === 'on_request' ? '#2A9D8F' : '#FFD700' }}>
                    {ap.priceMode === 'on_request' ? '💬 Open to discuss' : `from ${fanMoney(ap.price ?? 0)}`}
                  </span>
                </div>
                <p className="text-white/45 text-xs leading-relaxed mb-2">{ap.details}</p>
                {ap.calendlyUrl && (
                  <a href={ap.calendlyUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ background: 'linear-gradient(135deg,#00A2FF,#006FDB)', color: '#fff' }}>
                    📅 Book via Calendly →
                  </a>
                )}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-white/30 mb-4">Grassroots clubs welcome — {first} is happy to talk. ✊</div>
        </>
      )}

      {openSlots.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-widest text-white/30 mb-2">Next open dates</div>
          <div className="flex flex-wrap gap-1.5">
            {openSlots.map(s => (
              <span key={s.id} className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.05] border border-white/10 text-white/70">
                {prettyDate(s.date)} · {s.activity}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
