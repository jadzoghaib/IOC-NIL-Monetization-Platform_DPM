import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import type { AthleteRecord, AthleteQuery, GamesKey } from '../lib/api'
import { useStoreVersion, listOffers, listPosts } from '../lib/store'

interface Props {
  onPick: (id: string) => void
  games?: GamesKey
}

const ACCENT = '#2A9D8F' // oly-green / athlete teal
const PAGE = 60

function RosterRow({ athlete, onClick, index }: { athlete: AthleteRecord; onClick: () => void; index: number }) {
  useStoreVersion()
  const pendingOffers = listOffers({ athleteId: athlete.id }).filter(o => o.status === 'pending').length
  const postCount = listPosts(athlete.id).length
  const medals = athlete.medal_totals

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index * 0.006, 0.18), duration: 0.18 }}
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors border-b border-white/[0.04] last:border-0 hover:bg-emerald-500/5">
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/[0.04] flex-shrink-0">
        {athlete.thumbnail
          ? <img src={athlete.thumbnail} alt={athlete.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg">{athlete.flag}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{athlete.name}</div>
        <div className="text-white/35 text-xs">{athlete.flag} {athlete.country} · {athlete.sport}</div>
      </div>
      {medals && (medals.gold + medals.silver + medals.bronze) > 0 && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-white/55 flex-shrink-0">
          {medals.gold > 0 && <span>🥇{medals.gold > 1 ? `×${medals.gold}` : ''}</span>}
          {medals.silver > 0 && <span>🥈{medals.silver > 1 ? `×${medals.silver}` : ''}</span>}
          {medals.bronze > 0 && <span>🥉{medals.bronze > 1 ? `×${medals.bronze}` : ''}</span>}
        </div>
      )}
      {postCount > 0 && <span className="hidden md:inline text-[11px] text-white/30 flex-shrink-0">{postCount} post{postCount > 1 ? 's' : ''}</span>}
      {pendingOffers > 0 && (
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}>
          {pendingOffers} offer{pendingOffers > 1 ? 's' : ''}
        </span>
      )}
      <div className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold"
        style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
        Manage →
      </div>
    </motion.div>
  )
}

export default function AthleteRosterView({ onPick, games }: Props) {
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
  const [medalistsOnly, setMedalistsOnly] = useState(false)

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
    if (medalistsOnly) q.medalist_only = true
    return q
  }, [games, search, sport, country, medalistsOnly])

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

  const canLoadMore = items.length < total

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-4 mb-5 text-sm text-white/55"
        style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}26` }}>
        🎬 <span className="text-white/80 font-semibold">Demo god-mode:</span> pick any of {total.toLocaleString()} athletes to manage their content,
        courses, availability, and incoming sponsor offers.
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Search athlete, sport, country…"
          className="flex-1 min-w-48 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/40 transition-colors" />
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
        <button onClick={() => setMedalistsOnly(v => !v)}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${medalistsOnly ? 'bg-gold/15 text-gold border border-gold/30' : 'bg-white/[0.04] text-white/40 border border-white/10'}`}>
          🏅 Medalists only
        </button>
        {(searchInput || sport !== 'All' || country !== 'All' || medalistsOnly) && (
          <button onClick={() => { setSearchInput(''); setSearch(''); setSport('All'); setCountry('All'); setMedalistsOnly(false) }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 transition-colors">Clear</button>
        )}
      </div>
      <div className="text-white/25 text-xs mb-4">Showing {items.length.toLocaleString()} of {total.toLocaleString()}</div>

      {loading && items.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-16 animate-pulse">Loading roster…</div>
      ) : items.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-16">No athletes match your filters</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {items.map((a, i) => <RosterRow key={a.id} athlete={a} index={i} onClick={() => onPick(a.id)} />)}
        </div>
      )}

      {canLoadMore && (
        <div className="text-center mt-6">
          <button disabled={loading} onClick={loadMore}
            className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-emerald-400/40 text-sm font-semibold transition-all disabled:opacity-50">
            {loading ? 'Loading…' : `Load ${Math.min(PAGE, total - items.length)} more`}
          </button>
        </div>
      )}
    </motion.div>
  )
}
