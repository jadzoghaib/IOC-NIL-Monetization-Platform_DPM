import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import type { AthleteRecord, AthleteQuery, GamesKey } from '../lib/api'

interface Props {
  onViewAthlete: (id: string) => void
  games?: GamesKey
}

type SortKey = 'stars' | 'pageviews' | 'name' | 'medals'
type Tier = 'All' | 'Elite' | 'Pro' | 'Rising' | 'Micro'

const PAGE = 60

// ── Deal tier logic (mirrors backend, lightweight client proxy) ──────────────
function dealTier(a: AthleteRecord): { label: Exclude<Tier, 'All'>; color: string } {
  const pv = a.pageviews_60d || 0
  const gold = a.medal_totals?.gold || 0
  const score = Math.min(100,
    30 * Math.log10(Math.max(pv, 10)) / 7 +
    25 * ((a.stars || 3) / 5) +
    20 * (gold > 0 ? 1 : a.is_medalist ? 0.75 : 0.4) +
    15)
  if (score >= 70) return { label: 'Elite', color: '#FFD700' }
  if (score >= 53) return { label: 'Pro', color: '#A78BFA' }
  if (score >= 38) return { label: 'Rising', color: '#38BDF8' }
  return { label: 'Micro', color: '#34D399' }
}

function AthleteRowCard({ athlete, onClick, index, shortlisted, onShortlist }: {
  athlete: AthleteRecord; onClick: () => void; index: number; shortlisted: boolean; onShortlist: (e: React.MouseEvent) => void
}) {
  const tier = dealTier(athlete)
  const medals = athlete.medal_totals
  const pv = athlete.pageviews_60d || 0
  return (
    <div onClick={onClick}
      className="relative group flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors border-b border-white/[0.04] last:border-0 hover:bg-purple-500/5">
      <div className="text-white/20 text-sm w-6 text-right flex-shrink-0">{index + 1}</div>
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/[0.04] flex-shrink-0">
        {athlete.thumbnail
          ? <img src={athlete.thumbnail} alt={athlete.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg">{athlete.flag}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{athlete.name}</div>
        <div className="text-white/35 text-xs">{athlete.flag} {athlete.country} · {athlete.sport}</div>
      </div>
      <div className="hidden sm:flex items-center gap-1 text-xs flex-shrink-0 w-24">
        {medals && (medals.gold + medals.silver + medals.bronze) > 0 ? (
          <span className="text-white/60">
            {medals.gold > 0 && <span>🥇{medals.gold > 1 ? `×${medals.gold}` : ''} </span>}
            {medals.silver > 0 && <span>🥈{medals.silver > 1 ? `×${medals.silver}` : ''} </span>}
            {medals.bronze > 0 && <span>🥉{medals.bronze > 1 ? `×${medals.bronze}` : ''}</span>}
          </span>
        ) : athlete.is_medalist ? <span className="text-gold/50 text-xs">🏅</span> : <span className="text-white/15">—</span>}
      </div>
      <div className="hidden md:block text-white/40 text-xs flex-shrink-0 w-20 text-right">
        {pv >= 1_000_000 ? `${(pv / 1_000_000).toFixed(1)}M` : pv >= 1_000 ? `${(pv / 1_000).toFixed(0)}K` : `${pv}`}
        <div className="text-white/20">60d views</div>
      </div>
      <div className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider"
        style={{ background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}30` }}>
        {tier.label}
      </div>
      <button onClick={onShortlist}
        className="flex-shrink-0 text-xs px-2 py-1 rounded-lg transition-all"
        style={shortlisted
          ? { background: 'rgba(255,215,0,0.15)', color: '#FFD700' }
          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
        {shortlisted ? '★' : '☆'}
      </button>
    </div>
  )
}

export default function BusinessDiscoverView({ onViewAthlete, games }: Props) {
  const [items, setItems] = useState<AthleteRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sports, setSports] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sport, setSport] = useState('All')
  const [country, setCountry] = useState('All')
  const [medalistOnly, setMedalistOnly] = useState(false)
  const [tierFilter, setTierFilter] = useState<Tier>('All')   // client-side, on loaded items
  const [sortBy, setSortBy] = useState<SortKey>('stars')       // client-side, on loaded items
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set())

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 300); return () => clearTimeout(t) }, [searchInput])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getSports(games), api.getCountries(games)])
      .then(([s, c]) => { if (cancelled) return; setSports(s.sports.filter(x => x && x !== 'Unknown')); setCountries(c.countries.filter(x => x && x !== 'Unknown')) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [games])

  const buildQuery = useCallback((off: number): AthleteQuery => {
    const q: AthleteQuery = { games, limit: PAGE, offset: off }
    if (search.trim()) q.search = search.trim()
    if (sport !== 'All') q.sport = sport
    if (country !== 'All') q.country = country
    if (medalistOnly) q.medalist_only = true
    return q
  }, [games, search, sport, country, medalistOnly])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getAthletes(buildQuery(0))
      .then(p => { if (cancelled) return; setTotal(p.total); setItems(p.items); setOffset(p.items.length) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [buildQuery])

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const p = await api.getAthletes(buildQuery(offset))
      setItems(prev => [...prev, ...p.items]); setOffset(o => o + p.items.length); setTotal(p.total)
    } catch {} finally { setLoading(false) }
  }, [buildQuery, offset])

  const toggleShortlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setShortlisted(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const visible = useMemo(() => {
    let list = items
    if (tierFilter !== 'All') list = list.filter(a => dealTier(a).label === tierFilter)
    return [...list].sort((a, b) => {
      if (sortBy === 'stars') return (b.stars || 0) - (a.stars || 0)
      if (sortBy === 'pageviews') return (b.pageviews_60d || 0) - (a.pageviews_60d || 0)
      if (sortBy === 'medals') return ((b.medal_totals?.gold || 0) * 3 + (b.medal_totals?.silver || 0) * 2 + (b.medal_totals?.bronze || 0))
        - ((a.medal_totals?.gold || 0) * 3 + (a.medal_totals?.silver || 0) * 2 + (a.medal_totals?.bronze || 0))
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })
  }, [items, tierFilter, sortBy])

  const canLoadMore = items.length < total
  const TIERS: Tier[] = ['All', 'Elite', 'Pro', 'Rising', 'Micro']
  const TIER_COLORS: Record<Tier, string> = { All: '#A78BFA', Elite: '#FFD700', Pro: '#A78BFA', Rising: '#38BDF8', Micro: '#34D399' }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      {/* Summary banner */}
      <div className="rounded-2xl p-5 mb-6 grid grid-cols-3 gap-4"
        style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
        {[
          { label: 'Athletes in this Games', val: total.toLocaleString() },
          { label: 'Loaded so far', val: items.length.toLocaleString() },
          { label: 'Shortlisted', val: shortlisted.size.toLocaleString() },
        ].map(({ label, val }) => (
          <div key={label} className="text-center">
            <div className="text-white font-bold text-xl">{val}</div>
            <div className="text-white/35 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Search athlete, sport, country…"
          className="flex-1 min-w-48 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/40 transition-colors" />
        <select value={sport} onChange={e => setSport(e.target.value)}
          className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none max-w-44">
          <option value="All">All sports</option>
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={country} onChange={e => setCountry(e.target.value)}
          className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none max-w-44">
          <option value="All">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none">
          <option value="stars">Sort: Fan Rating</option>
          <option value="pageviews">Sort: Reach</option>
          <option value="medals">Sort: Medals</option>
          <option value="name">Sort: Name</option>
        </select>
        <button onClick={() => setMedalistOnly(v => !v)}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${medalistOnly ? 'bg-gold/15 text-gold border border-gold/30' : 'bg-white/[0.04] text-white/40 border border-white/10'}`}>
          🏅 Medalists only
        </button>
        {(searchInput || sport !== 'All' || country !== 'All' || medalistOnly || tierFilter !== 'All') && (
          <button onClick={() => { setSearchInput(''); setSearch(''); setSport('All'); setCountry('All'); setMedalistOnly(false); setTierFilter('All') }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 transition-colors">Clear</button>
        )}
      </div>

      {/* Tier pills (filter loaded results) */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TIERS.map(t => (
          <button key={t} onClick={() => setTierFilter(t)}
            className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all"
            style={tierFilter === t
              ? { background: `${TIER_COLORS[t]}20`, color: TIER_COLORS[t], border: `1px solid ${TIER_COLORS[t]}40` }
              : { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/25 self-center">Showing {visible.length} of {total.toLocaleString()}</span>
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-16 animate-pulse">Loading roster…</div>
      ) : visible.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-16">No athletes match your filters</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {visible.map((a, i) => (
            <AthleteRowCard key={a.id} athlete={a} index={i} onClick={() => onViewAthlete(a.id)}
              shortlisted={shortlisted.has(a.id)} onShortlist={e => toggleShortlist(a.id, e)} />
          ))}
        </div>
      )}

      {canLoadMore && (
        <div className="text-center mt-6">
          <button disabled={loading} onClick={loadMore}
            className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-purple-400/40 text-sm font-semibold transition-all disabled:opacity-50">
            {loading ? 'Loading…' : `Load ${Math.min(PAGE, total - items.length)} more`}
          </button>
        </div>
      )}
    </motion.div>
  )
}
