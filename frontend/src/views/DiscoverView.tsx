import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Medal, Landmark, Crown, MapPin, Star, Eye, Dumbbell, TrendingUp, Route, Flag } from 'lucide-react'
import type { useFollows } from '../hooks/useFollows'
import { api } from '../lib/api'
import type { AthleteRecord, AthletePage, AthleteQuery, GamesKey } from '../lib/api'
import FollowButton from '../components/FollowButton'
import StarRating from '../components/StarRating'
import { sportPictogramUrl, flagImageUrl, countryFlagUrl } from '../lib/sportIcons'
import MedalDots from '../components/MedalDots'
import { labelFor, ATHLETE_LABELS } from '../lib/athleteLabel'

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  legend:       Landmark,
  champion:     Crown,
  hometown:     MapPin,
  fan_favorite: Star,
  one_to_watch: Eye,
  grinder:      Dumbbell,
  underdog:     TrendingUp,
  trailblazer:  Route,
}

interface Props {
  follows: ReturnType<typeof useFollows>
  onViewProfile: (id: string) => void
  games?: GamesKey
}

const PAGE_SIZE = 60

export default function DiscoverView({ follows, onViewProfile, games }: Props) {
  const [items, setItems] = useState<AthleteRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sports, setSports] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])

  // Filters
  const [searchInput, setSearchInput] = useState('')   // raw user input
  const [search, setSearch] = useState('')              // debounced
  const [sport, setSport] = useState<string>('All')
  const [country, setCountry] = useState<string>('All')
  const [minStars, setMinStars] = useState<number>(0)
  const [medalistOnly, setMedalistOnly] = useState(false)
  const [labelFilter, setLabelFilter] = useState<string>('all')   // client-side fan-archetype filter

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load sport/country dropdown options when games changes
  useEffect(() => {
    let cancelled = false
    Promise.all([api.getSports(games), api.getCountries(games)])
      .then(([s, c]) => {
        if (cancelled) return
        setSports(s.sports.filter(x => x && x !== 'Unknown'))
        setCountries(c.countries.filter(x => x && x !== 'Unknown'))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [games])

  // Fetch when filters change (refetch from page 0)
  useEffect(() => {
    let cancelled = false
    const q: AthleteQuery = { games, limit: PAGE_SIZE, offset: 0 }
    if (search.trim()) q.search = search.trim()
    if (sport !== 'All') q.sport = sport
    if (country !== 'All') q.country = country
    if (minStars > 0) q.min_stars = minStars
    if (medalistOnly) q.medalist_only = true

    setLoading(true)
    api.getAthletes(q)
      .then(page => {
        if (cancelled) return
        setTotal(page.total)
        setItems(page.items)
        setOffset(page.items.length)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [games, search, sport, country, minStars, medalistOnly])

  // Load-more pagination
  const loadMore = useCallback(async () => {
    setLoading(true)
    const q: AthleteQuery = { games, limit: PAGE_SIZE, offset }
    if (search.trim()) q.search = search.trim()
    if (sport !== 'All') q.sport = sport
    if (country !== 'All') q.country = country
    if (minStars > 0) q.min_stars = minStars
    if (medalistOnly) q.medalist_only = true
    try {
      const page = await api.getAthletes(q)
      setItems(prev => [...prev, ...page.items])
      setOffset(o => o + page.items.length)
      setTotal(page.total)
    } catch {} finally { setLoading(false) }
  }, [games, search, sport, country, minStars, medalistOnly, offset])

  const canLoadMore = items.length < total
  const visible = labelFilter === 'all' ? items : items.filter(a => labelFor(a).key === labelFilter)

  return (
    <motion.div
      key="discover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl md:text-5xl text-white mb-2">DISCOVER ATHLETES</h1>
        <p className="text-white/40 text-sm">
          {total.toLocaleString()} athletes
          {games === 'paris_2024' && ' · Paris 2024 Summer Olympics'}
          {games === 'milan_2026' && ' · Milano-Cortina 2026 Winter Olympics'}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search athletes, countries, sports…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/8 text-white placeholder-white/25 text-sm focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          {/* Sport */}
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-white/70 text-sm focus:outline-none focus:border-gold/40 cursor-pointer min-w-[120px]"
          >
            <option value="All" className="bg-bg-card">All Sports</option>
            {sports.map(s => <option key={s} value={s} className="bg-bg-card">{s}</option>)}
          </select>

          {/* Country */}
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-white/70 text-sm focus:outline-none focus:border-gold/40 cursor-pointer min-w-[140px]"
          >
            <option value="All" className="bg-bg-card">All Countries</option>
            {countries.map(c => <option key={c} value={c} className="bg-bg-card">{c}</option>)}
          </select>

          {/* Stars filter */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-white/70 text-sm">
            <span className="text-white/40 text-xs">Min:</span>
            {[0, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setMinStars(n)}
                className={`text-xs px-1.5 py-0.5 rounded transition-all ${
                  minStars === n ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {n === 0 ? 'all' : `${n}★`}
              </button>
            ))}
          </div>

          {/* Medalist toggle */}
          <button
            onClick={() => setMedalistOnly(v => !v)}
            className={`px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-1.5 ${
              medalistOnly
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'bg-white/[0.04] border-white/8 text-white/50 hover:text-white/80'
            }`}
          >
            <Medal size={14} />
            Medalists only
          </button>

          {/* Reset */}
          {(searchInput || sport !== 'All' || country !== 'All' || minStars > 0 || medalistOnly || labelFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setSport('All')
                setCountry('All')
                setMinStars(0)
                setMedalistOnly(false)
                setLabelFilter('all')
              }}
              className="px-3 py-2 rounded-xl border border-white/8 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Fan archetype filter — single row with horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
          <button onClick={() => setLabelFilter('all')}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex-shrink-0"
            style={labelFilter === 'all'
              ? { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-2)' }
              : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
            All types
          </button>
          {ATHLETE_LABELS.map(l => {
            const LblIcon = ARCHETYPE_ICONS[l.key]
            return (
              <button key={l.key} onClick={() => setLabelFilter(l.key)} title={l.blurb}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex-shrink-0 whitespace-nowrap flex items-center gap-1"
                style={labelFilter === l.key
                  ? { background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}50` }
                  : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                {LblIcon && <LblIcon size={11} />}
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
        Showing {visible.length.toLocaleString()} of {total.toLocaleString()}
        {labelFilter !== 'all' && <span className="text-white/20 normal-case tracking-normal"> · filtered to {ATHLETE_LABELS.find(l => l.key === labelFilter)?.label} on this page</span>}
      </div>

      {/* Grid */}
      {visible.length === 0 && !loading ? (
        <div className="text-center py-20" style={{ color: 'var(--text-faint)' }}>
          <Search size={44} className="mb-4 mx-auto" style={{ opacity: 0.35 }} />
          <p>No athletes match your filters.</p>
          {labelFilter !== 'all' && <p className="text-sm mt-1" style={{ opacity: 0.6 }}>Try "Load more" or clear the type filter.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((athlete, i) => (
            <CompactAthleteCard
              key={athlete.id}
              athlete={athlete}
              isFollowed={follows.isFollowed(athlete.id)}
              onToggleFollow={() => follows.toggle(athlete.id)}
              onViewProfile={() => onViewProfile(athlete.id)}
              index={Math.min(i, 30)}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {canLoadMore && (
        <div className="text-center mt-8">
          <button
            disabled={loading}
            onClick={loadMore}
            className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-gold/40 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, total - items.length)} more`}
          </button>
        </div>
      )}
      {loading && items.length === 0 && (
        <div className="text-center py-20 text-white/30">Loading athletes…</div>
      )}
    </motion.div>
  )
}


// ── Compact card optimized for dense grids ──────────────────────────────

interface CardProps {
  athlete: AthleteRecord
  isFollowed: boolean
  onToggleFollow: () => void
  onViewProfile: () => void
  index?: number
}

function CompactAthleteCard({ athlete, isFollowed, onToggleFollow, onViewProfile, index = 0 }: CardProps) {
  const tier = athlete.stars >= 4.5 ? 'gold' : athlete.stars >= 3.5 ? 'silver' : athlete.stars >= 2.5 ? 'bronze' : 'base'

  const tierRaw = {
    gold:   { border: 'rgba(255,215,0,0.50)',   glow: 'rgba(255,215,0,0.08)',   bg: 'rgba(255,215,0,0.04)'   },
    silver: { border: 'rgba(140,140,148,0.45)', glow: 'rgba(192,192,192,0.06)', bg: 'rgba(192,192,192,0.03)' },
    bronze: { border: 'rgba(205,127,50,0.50)',  glow: 'rgba(205,127,50,0.06)',  bg: 'rgba(205,127,50,0.03)'  },
    base:   { border: 'var(--border)',           glow: 'transparent',            bg: 'transparent'             },
  }[tier]

  const medals      = athlete.medal_totals
  const hasMedalData = medals && (medals.gold + medals.silver + medals.bronze) > 0
  const pictogramUrl = sportPictogramUrl(athlete.sport)
  const flagUrl      = flagImageUrl(athlete.flag, 160) || countryFlagUrl(athlete.country, 160)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.22), duration: 0.25 }}
      whileHover={{ y: -2, boxShadow: `0 6px 24px ${tierRaw.glow}` }}
      className="relative rounded-2xl border cursor-pointer overflow-hidden flex flex-col"
      style={{
        borderColor: tierRaw.border,
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow)',
        minHeight: 240,
      }}
      onClick={onViewProfile}
    >
      {/* Tier-coloured top accent line */}
      {tier !== 'base' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: tierRaw.border }} />
      )}

      {/* Country flag — large, faded, bottom-right watermark */}
      {flagUrl && (
        <img
          src={flagUrl} alt="" aria-hidden loading="lazy"
          className="absolute -right-6 -bottom-3 w-36 pointer-events-none select-none"
          style={{ opacity: 0.10, objectFit: 'cover' }}
        />
      )}

      {/* Top-right: Olympic medal discs + count */}
      <div className="absolute top-2.5 right-2.5 z-10">
        {hasMedalData ? (
          <MedalDots
            gold={medals.gold}
            silver={medals.silver}
            bronze={medals.bronze}
            size="xs"
          />
        ) : athlete.is_medalist ? (
          <MedalDots gold={1} silver={0} bronze={0} size="xs" hideCount />
        ) : null}
        {(athlete.is_flagbearer_open || athlete.is_flagbearer_close) && (
          <Flag size={12} title="Flagbearer" className="block ml-auto mt-0.5" style={{ color: '#E63946' }} />
        )}
      </div>

      {/* Top image area — same height whether photo or flag placeholder */}
      <div className="w-full h-40 overflow-hidden relative flex-shrink-0">
        {athlete.thumbnail ? (
          <>
            <img src={athlete.thumbnail} alt={athlete.name}
              className="w-full h-full object-cover object-top" loading="lazy" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-card) 100%)' }} />
          </>
        ) : (
          <div className="w-full h-full flex items-end justify-end p-2"
            style={{ background: 'var(--surface-2)' }}>
            {flagUrl ? (
              <img src={flagUrl} alt={athlete.country} className="h-8 rounded object-cover opacity-60"
                style={{ maxWidth: 48 }} loading="lazy" />
            ) : (
              <span className="text-4xl opacity-50">{athlete.flag}</span>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 p-4 flex-1 flex flex-col" style={{ paddingTop: athlete.thumbnail ? 8 : 12 }}>

        <h3 className="font-display text-sm text-white leading-tight mb-0.5 pr-8">
          {athlete.name.toUpperCase()}
        </h3>
        <p className="text-xs text-white/35 mb-2">{athlete.country || '—'}</p>

        {/* Sport + archetype label row */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <p className="text-xs text-white/45 flex items-center gap-1">
            {pictogramUrl && (
              <img src={pictogramUrl} alt="" width={13} height={13} loading="lazy"
                className="sport-pictogram"
                style={{ opacity: 0.55, flexShrink: 0 }} />
            )}
            <span className="truncate max-w-[90px]">{athlete.sport}</span>
          </p>
          {(() => {
            const lbl = labelFor(athlete)
            const LblIcon = ARCHETYPE_ICONS[lbl.key]
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: `${lbl.color}18`, color: lbl.color, border: `1px solid ${lbl.color}30` }} title={lbl.blurb}>
                {LblIcon && <LblIcon size={9} color={lbl.color} />}
                {lbl.label}
              </span>
            )
          })()}
        </div>

        {/* Bottom row: stars + follow — pushed to bottom */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <StarRating stars={athlete.stars} size="xs" />
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFollow() }}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all duration-200 ${
              isFollowed
                ? 'text-gold bg-gold/15 border border-gold/30'
                : 'text-white/40 hover:text-white/75 border border-white/10 hover:border-white/20'
            }`}
          >
            {isFollowed ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
