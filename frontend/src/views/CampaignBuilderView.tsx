import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GamesKey } from '../lib/api'
import InfoPopover from '../components/InfoPopover'
import {
  addCampaign, addOffers, addMessage, CATEGORIES, REGIONS, BUDGET_BANDS, DEAL_TYPE_META, type DealType,
} from '../lib/store'

const ACCENT = '#A78BFA'
const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`)

const inputCls =
  'w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/40 transition-colors'

const BUDGET_RANGE: Record<string, [number, number]> = {
  '$1K–$5K':     [1000, 5000],
  '$5K–$25K':    [5000, 25000],
  '$25K–$100K':  [25000, 100000],
  '$100K+':      [100000, 250000],
}

// Rough country → region mapping so the region filter actually means something.
const REGION_COUNTRIES: Record<string, string[]> = {
  Europe: ['France', 'Germany', 'United Kingdom', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway', 'Switzerland', 'Austria', 'Belgium', 'Ireland', 'Denmark', 'Finland', 'Poland', 'Portugal'],
  'North America': ['United States', 'Canada', 'Mexico'],
  'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile'],
  'Asia-Pacific': ['Japan', 'China', 'South Korea', 'Australia', 'New Zealand', 'India'],
  'Middle East & Africa': ['South Africa', 'Egypt', 'Morocco', 'Kenya', 'Nigeria', 'Israel', 'Saudi Arabia'],
}

interface AthleteRow {
  id: string; name: string; sport: string; flag: string; country: string
  thumbnail?: string; is_medalist?: boolean; stars?: number
  medal_totals?: { gold: number; silver: number; bronze: number }
  pageviews_60d?: number
  marketability_score?: number       // canonical score from backend business_metrics
  available_categories?: string[]    // sponsorship categories still open for this athlete
}

interface Ranked extends AthleteRow {
  fit: number      // 0–100 — campaign-adjusted brand fit
  tier: { label: string; color: string }
  amount: number
}

// Base marketability comes from the backend (single source of truth:
// business_metrics). A local proxy is only a fallback if the field is missing.
function baseScore(a: AthleteRow): number {
  if (typeof a.marketability_score === 'number') return a.marketability_score
  const pv = a.pageviews_60d || 0
  const gold = a.medal_totals?.gold || 0
  return Math.min(100,
    30 * Math.log10(Math.max(pv, 10)) / 7 +
    25 * ((a.stars || 3) / 5) +
    20 * (gold > 0 ? 1 : a.is_medalist ? 0.75 : 0.4) +
    15)
}
// Canonical deal tiers — identical thresholds to backend business_metrics, and
// derived from the SAME score shown as "Fit" so the label can't disagree with it.
function tierFor(score: number) {
  if (score >= 80) return { label: 'Elite', color: '#FFD700' }
  if (score >= 65) return { label: 'Pro', color: '#A78BFA' }
  if (score >= 45) return { label: 'Rising', color: '#38BDF8' }
  return { label: 'Micro', color: '#34D399' }
}

interface Props {
  games?: GamesKey
  brand: string
  defaultCategory?: string   // sponsor's primary category from onboarding
  onSent: () => void
}

export default function CampaignBuilderView({ games, brand, defaultCategory, onSent }: Props) {
  const [phase, setPhase] = useState<'brief' | 'results'>('brief')
  const [loading, setLoading] = useState(false)

  // Brief — default the category to the sponsor's primary category when we have it.
  const [name, setName] = useState('')
  const [category, setCategory] = useState(
    defaultCategory && CATEGORIES.includes(defaultCategory) ? defaultCategory : CATEGORIES[0],
  )
  const [region, setRegion] = useState(REGIONS[0])
  const [budget, setBudget] = useState(BUDGET_BANDS[1])
  const [dealType, setDealType] = useState<DealType>('brand_ambassador')
  const [goal, setGoal] = useState('')

  // Results
  const [ranked, setRanked] = useState<Ranked[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Popup + switch
  const [popupId, setPopupId] = useState<string | null>(null)
  const [switchMode, setSwitchMode] = useState(false)
  const [switchSearch, setSwitchSearch] = useState('')

  const findAthletes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '400' })
      if (games) params.set('games', games)
      const res = await fetch(`/api/athletes?${params}`)
      const data = await res.json()
      const rows: AthleteRow[] = data.items || []
      const [lo, hi] = BUDGET_RANGE[budget] || [5000, 25000]
      const regionSet = region !== 'Worldwide' ? new Set(REGION_COUNTRIES[region] || []) : null
      const goalLc = goal.trim().toLowerCase()

      // Campaign-adjusted brand fit: start from the canonical marketability score,
      // then apply the brief — region preference, brand-category availability,
      // deal type, and goal keywords. "Fit" and "tier" derive from the SAME number.
      const computeFit = (a: AthleteRow): number => {
        const base = baseScore(a)
        let fit = base
        if (regionSet) fit += regionSet.has(a.country) ? 10 : -6
        const catOpen = (a.available_categories || []).includes(category)
        fit += catOpen ? 8 : -4
        if (dealType === 'brand_ambassador') fit += base >= 65 ? 4 : -2       // long commitments favour proven names
        else if (dealType === 'event_appearance' && a.is_medalist) fit += 3   // appearances lean on medal pedigree
        else if (dealType === 'social_post' && (a.pageviews_60d || 0) > 50000) fit += 3  // posts reward reach
        if (goalLc && (goalLc.includes((a.sport || '').toLowerCase()) || goalLc.includes((a.country || '').toLowerCase()))) fit += 4
        return Math.max(0, Math.min(100, Math.round(fit)))
      }

      const ranked0: Ranked[] = rows.map(a => {
        const fit = computeFit(a)
        return { ...a, fit, tier: tierFor(fit), amount: Math.round(lo + (fit / 100) * (hi - lo)) }
      })

      let r: Ranked[]
      if (regionSet) {
        // Region selected — regional athletes appear first, padded with global top.
        const inRegion  = ranked0.filter(a => regionSet.has(a.country)).sort((x, y) => y.fit - x.fit)
        const outRegion = ranked0.filter(a => !regionSet.has(a.country)).sort((x, y) => y.fit - x.fit)
        r = [...inRegion, ...outRegion].slice(0, 40)
      } else {
        r = ranked0.sort((x, y) => y.fit - x.fit).slice(0, 40)
      }

      setRanked(r)
      // Pre-select the top 5 as a helpful default shortlist.
      setSelected(new Set(r.slice(0, 5).map(a => a.id)))
      setPhase('results')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectedRows = ranked.filter(a => selected.has(a.id))
  const total = selectedRows.reduce((s, a) => s + a.amount, 0)

  const send = () => {
    if (selectedRows.length === 0) return
    const campaign = addCampaign({
      brand, name: name.trim() || `${category} push`, category, region, budgetBand: budget, goal: goal.trim(),
      athleteIds: selectedRows.map(a => a.id),
    })
    const offers = addOffers(selectedRows.map(a => ({
      campaignId: campaign.id,
      brand,
      athleteId: a.id,
      athleteName: a.name,
      dealType,
      amount: a.amount,
      message: goal.trim() || `${brand} would love to partner with you on a ${DEAL_TYPE_META[dealType].label.toLowerCase()}.`,
    })))
    offers.forEach(o => {
      addMessage(o.id, 'system', `${brand} opened a deal · ${DEAL_TYPE_META[dealType].label} · $${o.amount.toLocaleString()}`)
      addMessage(o.id, 'sponsor', o.message)
    })
    onSent()
  }

  // ── Brief phase ─────────────────────────────────────────────────────────────
  if (phase === 'brief') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="font-display text-3xl text-white">CAMPAIGN BRIEF</h2>
          <p className="text-white/35 text-sm mt-1">Describe what you want — we'll rank athletes by brand fit and price each offer to your budget.</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.18)' }}>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider">Campaign name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Winter Launch 2026" className={inputCls + ' mt-1'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls + ' mt-1'}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider">Target region</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className={inputCls + ' mt-1'}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider">Budget band</label>
              <select value={budget} onChange={e => setBudget(e.target.value)} className={inputCls + ' mt-1'}>
                {BUDGET_BANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider">Deal type</label>
              <select value={dealType} onChange={e => setDealType(e.target.value as DealType)} className={inputCls + ' mt-1'}>
                {Object.entries(DEAL_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider">Goal / message to athletes</label>
            <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2}
              placeholder="What's the campaign about? This becomes the note on each offer." className={inputCls + ' mt-1 resize-none'} />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={findAthletes} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: '#160d2e' }}
          >
            {loading ? 'Ranking athletes…' : 'Find brand-fit athletes →'}
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ── Results phase ───────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-28">
      <button onClick={() => setPhase('brief')} className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm mb-4 transition-colors">
        ← Edit brief
      </button>

      <div className="mb-4">
        <h2 className="font-display text-2xl text-white flex items-center gap-2">
          RANKED FOR: <span style={{ color: ACCENT }}>{category}</span>
          <InfoPopover title="How ranking works" align="left">
            <b>What drives the order:</b> each athlete starts from a <b>Marketability Score (0–100)</b> built from Wikipedia pageviews, Olympic medals, sport tier, and country market value. Your brief then adjusts it — <b>{region}</b> preference, <b>{category}</b> category availability, deal type, and budget band. All reach, engagement, and deal figures are <b>modeled estimates</b> for this demo; in production athletes supply verified data.
          </InfoPopover>
        </h2>
        <p className="text-white/35 text-sm mt-1">
          {ranked.length} athletes{region !== 'Worldwide' ? ` · ${region} first` : ''} · {budget}. Click a row to view profile — check box to shortlist. <span className="text-white/25">Fit &amp; pricing are demo estimates.</span>
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {ranked.map((a, i) => {
          const on = selected.has(a.id)
          return (
            <div key={a.id} onClick={() => setPopupId(a.id)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/[0.04] last:border-0 transition-colors hover:bg-purple-500/5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                style={on
                  ? { background: ACCENT, border: `1px solid ${ACCENT}` }
                  : { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={(e) => { e.stopPropagation(); toggle(a.id) }}>
                {on && <span className="text-[#160d2e] text-xs font-black">✓</span>}
              </div>
              <div className="text-white/20 text-xs w-5 text-right flex-shrink-0">{i + 1}</div>
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                {a.thumbnail ? <img src={a.thumbnail} alt={a.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-sm">{a.flag}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{a.name}</div>
                <div className="text-white/35 text-xs">{a.flag} {a.country} · {a.sport}</div>
              </div>
              <div className="hidden sm:flex flex-col items-end flex-shrink-0 w-16">
                <div className="text-white/30 text-[10px] uppercase tracking-wider">Fit</div>
                <div className="text-white/70 text-sm font-bold">{Math.round(a.fit)}</div>
              </div>
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider w-16 text-center"
                style={{ background: `${a.tier.color}18`, color: a.tier.color, border: `1px solid ${a.tier.color}30` }}>
                {a.tier.label}
              </span>
              <div className="text-white font-bold text-sm w-16 text-right flex-shrink-0">{money(a.amount)}</div>
            </div>
          )
        })}
      </div>

      {/* Sticky send bar */}
      <AnimatePresence>
        {selectedRows.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
          >
            <div className="max-w-6xl mx-auto rounded-2xl p-4 flex items-center gap-4 backdrop-blur-xl"
              style={{ background: 'rgba(20,16,40,0.92)', border: `1px solid ${ACCENT}40`, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">{selectedRows.length} athlete{selectedRows.length > 1 ? 's' : ''} selected</div>
                <div className="text-white/40 text-xs">Total offer value ≈ {money(total)} · {DEAL_TYPE_META[dealType].label}</div>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={send}
                className="px-6 py-3 rounded-xl text-sm font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: '#160d2e' }}>
                Send {selectedRows.length} offer{selectedRows.length > 1 ? 's' : ''} →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Athlete profile popup ────────────────────────────────────────────── */}
      {popupId && (() => {
        const pa = ranked.find(a => a.id === popupId)
        if (!pa) return null
        const onSelect = selected.has(pa.id)
        const switchCandidates = switchMode
          ? ranked.filter(a =>
              a.id !== pa.id &&
              !selected.has(a.id) &&
              (switchSearch.trim() === '' || a.name.toLowerCase().includes(switchSearch.toLowerCase()))
            )
          : []

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setPopupId(null); setSwitchMode(false); setSwitchSearch('') }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: '#141028', border: `1px solid ${ACCENT}35`, boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-5 pb-4" style={{ background: `linear-gradient(135deg, ${pa.tier.color}18 0%, transparent 100%)` }}>
                <button
                  className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.06] text-lg leading-none transition-all"
                  onClick={() => { setPopupId(null); setSwitchMode(false); setSwitchSearch('') }}
                >×</button>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/[0.05] flex-shrink-0 border border-white/[0.08]">
                    {pa.thumbnail
                      ? <img src={pa.thumbnail} alt={pa.name} className="w-full h-full object-cover object-top" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">{pa.flag}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-base leading-tight truncate">{pa.name}</div>
                    <div className="text-white/40 text-xs mt-0.5">{pa.flag} {pa.country} · {pa.sport}</div>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background: `${pa.tier.color}18`, color: pa.tier.color, border: `1px solid ${pa.tier.color}30` }}>
                      {pa.tier.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="px-5 py-3 grid grid-cols-3 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-center">
                  <div className="text-white font-bold text-xl">{Math.round(pa.fit)}</div>
                  <div className="text-white/30 text-[10px] uppercase tracking-wider mt-0.5">Brand Fit</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-xl">{pa.stars?.toFixed(1) ?? '—'}</div>
                  <div className="text-white/30 text-[10px] uppercase tracking-wider mt-0.5">Stars</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-xl" style={{ color: ACCENT }}>{money(pa.amount)}</div>
                  <div className="text-white/30 text-[10px] uppercase tracking-wider mt-0.5">Offer</div>
                </div>
              </div>

              {/* Medals */}
              {pa.medal_totals && (pa.medal_totals.gold + pa.medal_totals.silver + pa.medal_totals.bronze) > 0 && (
                <div className="px-5 py-2.5 flex gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {pa.medal_totals.gold   > 0 && <span className="text-xs text-white/60">🥇 ×{pa.medal_totals.gold}</span>}
                  {pa.medal_totals.silver > 0 && <span className="text-xs text-white/60">🥈 ×{pa.medal_totals.silver}</span>}
                  {pa.medal_totals.bronze > 0 && <span className="text-xs text-white/60">🥉 ×{pa.medal_totals.bronze}</span>}
                </div>
              )}

              {/* Actions */}
              {!switchMode ? (
                <div className="px-5 py-4 flex gap-2">
                  <button
                    onClick={() => { toggle(pa.id); setPopupId(null) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={onSelect
                      ? { background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }
                      : { background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40` }}>
                    {onSelect ? 'Cut ✕' : 'Keep ✓'}
                  </button>
                  {onSelect && (
                    <button
                      onClick={() => setSwitchMode(true)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      Switch ↔
                    </button>
                  )}
                </div>
              ) : (
                <div className="px-5 py-4 space-y-2.5">
                  <p className="text-white/40 text-xs">Replace {pa.name} with…</p>
                  <input
                    autoFocus
                    value={switchSearch}
                    onChange={e => setSwitchSearch(e.target.value)}
                    placeholder="Type an athlete name…"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/40"
                  />
                  <div className="max-h-44 overflow-y-auto rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {switchCandidates.length === 0
                      ? <p className="px-3 py-3 text-white/25 text-xs">{switchSearch.trim() ? 'No matches' : 'Start typing to search'}</p>
                      : switchCandidates.slice(0, 8).map(c => (
                          <button key={c.id}
                            onClick={() => {
                              setSelected(prev => { const n = new Set(prev); n.delete(pa.id); n.add(c.id); return n })
                              setPopupId(null); setSwitchMode(false); setSwitchSearch('')
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0">
                            <span className="text-sm leading-none">{c.flag}</span>
                            <span className="text-white text-xs font-semibold flex-1 truncate">{c.name}</span>
                            <span className="text-white/25 text-[10px] flex-shrink-0">{c.country}</span>
                            <span className="flex-shrink-0 text-xs font-bold" style={{ color: ACCENT }}>{money(c.amount)}</span>
                          </button>
                        ))}
                  </div>
                  <button onClick={() => { setSwitchMode(false); setSwitchSearch('') }}
                    className="text-white/30 text-xs hover:text-white/60 transition-colors">← Back</button>
                </div>
              )}
            </motion.div>
          </div>
        )
      })()}
    </motion.div>
  )
}
