import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { addOffer, addMessage, getSponsor, DEAL_TYPE_META, type DealType } from '../lib/store'
import InfoPopover from '../components/InfoPopover'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CategoryAvail { category: string; available: boolean }
interface DealEstimate  { label: string; min: number; max: number; unit: string }
interface BusinessMetrics {
  marketability_score:  number
  deal_tier:            string
  tier_color:           string
  audience_reach:       number
  engagement_rate:      number
  performance_tier:     string
  performance_score:    number
  brand_safety_score:   number
  brand_safety_grade:   string
  category_availability: CategoryAvail[]
  deal_estimates:       Record<string, DealEstimate>
  primary_market:       string
  market_value:         string
  comparable_brands:    string[]
  sport_tier:           number
  cpm_multiplier:       number
}
interface Athlete {
  id: string; name: string; sport: string; flag: string; country: string
  thumbnail?: string; games?: string[]; is_medalist?: boolean
  medal_totals?: { gold: number; silver: number; bronze: number }
  stars?: number
  business_metrics: BusinessMetrics
}

interface Props {
  athleteId: string
  onBack: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000    ? `${(n / 1_000).toFixed(0)}K`
  : `${n}`

const fmtMoney = (n: number) =>
  n >= 1_000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`

const TIER_BG: Record<string, string> = {
  Elite:   'rgba(255,215,0,0.12)',
  Pro:     'rgba(167,139,250,0.12)',
  Rising:  'rgba(56,189,248,0.12)',
  Micro:   'rgba(52,211,153,0.12)',
}
const TIER_BORDER: Record<string, string> = {
  Elite:   'rgba(255,215,0,0.3)',
  Pro:     'rgba(167,139,250,0.3)',
  Rising:  'rgba(56,189,248,0.3)',
  Micro:   'rgba(52,211,153,0.3)',
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = circ * score / 100
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
      <text
        x={size/2} y={size/2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.22} fontWeight="700"
        transform={`rotate(90, ${size/2}, ${size/2})`}
      >
        {score}
      </text>
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent = '#A78BFA', info }: {
  icon: string; label: string; value: string; sub?: string; accent?: string; info?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}
    >
      <div className="flex items-start justify-between">
        <div className="text-xl mb-1">{icon}</div>
        {info && <InfoPopover title={label}>{info}</InfoPopover>}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-white font-bold text-lg leading-tight">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BusinessAthleteView({ athleteId, onBack }: Props) {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)
  const [shortlisted, setShortlisted] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerSent, setOfferSent] = useState(false)

  useEffect(() => {
    setLoading(true); setError(null)
    fetch(`/api/athletes/${athleteId}/business`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then(d => { setAthlete(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [athleteId])

  if (loading) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh]">
      <div className="text-white/40 text-sm animate-pulse">Loading partnership data…</div>
    </motion.div>
  )

  if (error || !athlete) return (
    <div className="text-white/40 text-center py-20">
      <div className="text-4xl mb-4">⚠️</div>
      <div>Failed to load athlete data</div>
      <button onClick={onBack} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">← Back</button>
    </div>
  )

  const bm = athlete.business_metrics
  const tc = bm.tier_color
  const medals = athlete.medal_totals

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* ── Back ── */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm transition-colors mb-6"
      >
        ← Back to roster
      </button>

      {/* ── HERO HEADER ── */}
      <div
        className="relative rounded-3xl overflow-hidden mb-6 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
        style={{
          background: `linear-gradient(135deg, rgba(17,17,51,0.98) 0%, ${tc}18 100%)`,
          border: `1px solid ${tc}35`,
        }}
      >
        {/* Thumbnail */}
        {athlete.thumbnail && (
          <div className="relative flex-shrink-0">
            <img
              src={athlete.thumbnail} alt={athlete.name}
              className="w-24 h-24 rounded-2xl object-cover"
              style={{ border: `2px solid ${tc}40` }}
            />
            {/* Deal tier badge */}
            <div
              className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ background: TIER_BG[bm.deal_tier] || 'rgba(167,139,250,0.15)', color: tc, border: `1px solid ${TIER_BORDER[bm.deal_tier] || tc + '30'}` }}
            >
              {bm.deal_tier}
            </div>
          </div>
        )}

        {/* Name + basic info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-white/40 text-sm">{athlete.flag} {athlete.country}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-sm">{athlete.sport}</span>
            {athlete.is_medalist && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
                {medals && (medals.gold + medals.silver + medals.bronze) > 0
                  ? `${medals.gold > 0 ? `🥇×${medals.gold} ` : ''}${medals.silver > 0 ? `🥈×${medals.silver} ` : ''}${medals.bronze > 0 ? `🥉×${medals.bronze}` : ''}`.trim()
                  : '🏅 Medalist'}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide">{athlete.name.toUpperCase()}</h1>
          <p className="text-white/40 text-xs mt-1">
            {(athlete.games || []).map(g => g === 'paris_2024' ? '🇫🇷 Paris 2024' : '🇮🇹 Milano-Cortina 2026').join(' · ')}
          </p>
        </div>

        {/* Marketability score ring */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <ScoreRing score={bm.marketability_score} color={tc} size={96} />
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold flex items-center gap-1">
            Marketability
            <InfoPopover title="Marketability" align="left">
              <b>What it means:</b> one headline score (0–100) for how attractive this athlete is to partners. <b>The logic:</b> a weighted blend — 35% reach + 30% performance + 20% brand safety + 15% engagement.
            </InfoPopover>
          </div>
        </div>

        {/* Shortlist button */}
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => setShortlisted(s => !s)}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={shortlisted
            ? { background: tc + '25', color: tc, border: `1px solid ${tc}50` }
            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
          }
        >
          {shortlisted ? '★ Shortlisted' : '☆ Shortlist'}
        </motion.button>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard icon="👥" label="Audience Reach" value={fmt(bm.audience_reach)} sub="est. monthly" accent="#A78BFA"
          info={<><b>What it means:</b> roughly how many people this athlete puts a message in front of in a month. <b>The logic:</b> we scale their Wikipedia attention up by how mainstream their sport is and whether they medalled. It's a reach <i>proxy</i> — not a verified follower count.</>} />
        <KpiCard icon="💬" label="Engagement Rate" value={`${bm.engagement_rate}%`} sub="vs 2.3% avg" accent="#38BDF8"
          info={<><b>What it means:</b> of the people who see a post, what share actually like, comment, or share it — i.e. how <i>active</i> the following is, not just how big. <b>Why it matters:</b> a smaller, fired-up audience often converts better than a huge passive one. <b>The logic:</b> niche athletes usually run hot (4–9%), mega-reach stars sit lower (1–2%); we then nudge it up for athletes with strong fan ratings.</>} />
        <KpiCard icon="🛡️" label="Brand Safety" value={bm.brand_safety_grade} sub={`${bm.brand_safety_score}/100`} accent="#34D399"
          info={<><b>What it means:</b> how "safe" a brand should feel attaching its name to this athlete. <b>The logic:</b> starts from a baseline for their sport, adds a bump for medals, with a little variance — graded A+ to C.</>} />
        <KpiCard icon="🌍" label="Primary Market" value={bm.primary_market} sub={`${bm.market_value} CPM · ×${bm.cpm_multiplier}`} accent="#FB923C"
          info={<><b>What it means:</b> the home market where this athlete is most valuable, and how pricey that ad market is. <b>The logic:</b> their country, with a CPM multiplier from a market table (US ×3.2 → India ×1.1).</>} />
      </div>

      {/* ── LOWER GRID: Performance + Category + Deals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Performance Credentials */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-1.5">
            Performance Credentials
            <InfoPopover title="Performance Credentials">
              <b>What it means:</b> the athlete's competitive standing in one tier. <b>The logic:</b> from the medal haul (2+ golds = Multi-Gold, 1 gold = Champion, any medal = Medalist) plus how many Games they've appeared at.
            </InfoPopover>
          </h3>
          {/* Perf tier badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{ background: `${tc}15`, border: `1px solid ${tc}30` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: tc }} />
            <span className="text-xs font-bold" style={{ color: tc }}>{bm.performance_tier}</span>
          </div>
          {/* Score bar */}
          <div className="space-y-3">
            {[
              { label: 'Performance', val: bm.performance_score, color: tc },
              { label: 'Brand Safety', val: bm.brand_safety_score, color: '#34D399' },
              { label: 'Audience Reach', val: Math.round(Math.log10(Math.max(bm.audience_reach, 10)) / Math.log10(10_000_000) * 100), color: '#A78BFA' },
              { label: 'Engagement',    val: Math.round(Math.min(bm.engagement_rate / 9, 1) * 100), color: '#38BDF8' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{label}</span><span>{val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Comparable brands */}
          {bm.comparable_brands.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Comparable brand partners</div>
              <div className="flex flex-wrap gap-1.5">
                {bm.comparable_brands.map(b => (
                  <span key={b} className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-white/50">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Availability */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-1.5">
            Category Availability
            <InfoPopover title="Category Availability">
              <b>What it means:</b> which sponsorship slots (e.g. Sportswear, Beverages) are likely still open vs. already taken. <b>The logic:</b> a model guess — the more famous the athlete, the more likely a category is spoken for. Always verify with their management.
            </InfoPopover>
          </h3>
          <p className="text-xs text-white/30 mb-4 leading-relaxed">
            Estimated exclusivity map based on athlete profile and tier. Verify directly with management.
          </p>
          <div className="space-y-2.5">
            {bm.category_availability.map(({ category, available }) => (
              <div key={category} className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">{category}</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: available ? '#34D399' : '#EF4444' }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: available ? '#34D399' : '#EF4444' }}
                  >
                    {available ? 'Available' : 'Taken'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs text-white/25">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              Estimates only — always verify with athlete management
            </div>
          </div>
        </div>

        {/* Deal Estimates */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-1.5">
            Estimated Partnership Value
            <InfoPopover title="Estimated Partnership Value">
              <b>What it means:</b> a rough market rate for working with this athlete, by deal type. <b>The logic:</b> built from their reach × how pricey their market is × how mainstream their sport is, with a medal bonus — then split into per-post, per-appearance, and monthly-ambassador bands.
            </InfoPopover>
          </h3>
          <p className="text-xs text-white/30 mb-4 leading-relaxed">
            Market-rate estimates calibrated to reach, engagement, and sport tier.
          </p>
          <div className="space-y-4">
            {Object.entries(bm.deal_estimates).map(([key, deal]) => (
              <div key={key}>
                <div className="text-xs font-semibold text-white/60 mb-1">{deal.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white text-lg">{fmtMoney(deal.min)}</span>
                  <span className="text-white/30 text-sm">–</span>
                  <span className="font-bold text-white text-lg">{fmtMoney(deal.max)}</span>
                  <span className="text-white/30 text-xs ml-1">{deal.unit}</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (deal.max / 300000) * 100)}%`, background: tc }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          {offerSent ? (
            <div className="w-full mt-5 py-3 rounded-xl text-sm font-bold tracking-wide text-center"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
              ✓ Offer sent — track it in “My Offers”
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setOfferOpen(true)}
              className="w-full mt-5 py-3 rounded-xl text-sm font-bold tracking-wide"
              style={{ background: `linear-gradient(135deg, ${tc}30, ${tc}18)`, color: tc, border: `1px solid ${tc}40` }}
            >
              Send Partnership Offer →
            </motion.button>
          )}
        </div>
      </div>

      {/* ── DISCLAIMER ── */}
      <div className="text-center text-[11px] text-white/20 pb-4">
        All metrics are model-generated estimates based on public performance data and industry benchmarks.
        Engagement, reach, and pricing figures require verification with athlete management.
      </div>

      {/* ── OFFER MODAL ── */}
      <AnimatePresence>
        {offerOpen && (
          <OfferModal
            athleteId={athlete.id}
            athleteName={athlete.name}
            tierColor={tc}
            dealEstimates={bm.deal_estimates}
            onClose={() => setOfferOpen(false)}
            onSent={() => { setOfferOpen(false); setOfferSent(true) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Offer modal ───────────────────────────────────────────────────────────────
function OfferModal({
  athleteId, athleteName, tierColor, dealEstimates, onClose, onSent,
}: {
  athleteId: string
  athleteName: string
  tierColor: string
  dealEstimates: Record<string, DealEstimate>
  onClose: () => void
  onSent: () => void
}) {
  const brand = getSponsor().brand || 'Your Brand'
  // Only offer deal types we have price estimates for, so the prefill is meaningful.
  const options = Object.keys(dealEstimates).filter(k => k in DEAL_TYPE_META) as DealType[]
  const mid = (dt: DealType) => {
    const de = dealEstimates[dt]
    return de ? Math.round((de.min + de.max) / 2) : 1000
  }
  const [dealType, setDealType] = useState<DealType>(options[0] ?? 'social_post')
  const [amount, setAmount] = useState<number>(mid(options[0] ?? 'social_post'))
  const [message, setMessage] = useState(`Hi ${athleteName.split(' ')[0]}, ${brand} would love to partner with you.`)

  const pickDeal = (dt: DealType) => { setDealType(dt); setAmount(mid(dt)) }

  const send = () => {
    const o = addOffer({ brand, athleteId, athleteName, dealType, amount, message: message.trim() })
    addMessage(o.id, 'system', `${brand} opened a deal · ${DEAL_TYPE_META[dealType].label} · $${amount.toLocaleString()}`)
    if (message.trim()) addMessage(o.id, 'sponsor', message.trim())
    onSent()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl p-6"
        style={{ background: '#0D0D2B', border: `1px solid ${tierColor}40` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-white tracking-wide">SEND OFFER</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg">✕</button>
        </div>
        <p className="text-white/40 text-sm mb-5">
          From <span style={{ color: tierColor }} className="font-semibold">{brand}</span> to {athleteName}
        </p>

        <label className="text-[11px] text-white/40 uppercase tracking-wider">Deal type</label>
        <div className="flex flex-wrap gap-2 mt-1 mb-4">
          {options.map(dt => (
            <button key={dt} onClick={() => pickDeal(dt)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={dealType === dt
                ? { background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}45` }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {DEAL_TYPE_META[dt].icon} {DEAL_TYPE_META[dt].label}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 uppercase tracking-wider">Offer amount (USD)</label>
        <input type="number" min={0} value={amount} onChange={e => setAmount(Math.max(0, +e.target.value))}
          className="w-full mt-1 mb-4 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/40" />

        <label className="text-[11px] text-white/40 uppercase tracking-wider">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
          className="w-full mt-1 mb-5 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/40 resize-none" />

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={send}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: `linear-gradient(135deg, ${tierColor}, ${tierColor}cc)`, color: '#0D0D2B' }}>
          Send offer to {athleteName.split(' ')[0]} →
        </motion.button>
        <p className="text-white/25 text-[11px] text-center mt-3">
          Lands in the athlete's inbox in Athlete Mode — they can accept or decline.
        </p>
      </motion.div>
    </motion.div>
  )
}
