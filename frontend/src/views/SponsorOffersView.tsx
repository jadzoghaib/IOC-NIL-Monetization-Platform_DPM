import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  useStoreVersion, listOffers, listCampaigns, deleteCampaign, threadCount,
  DEAL_TYPE_META, type Offer,
} from '../lib/store'
import ChatThread from '../components/ChatThread'

const ACCENT = '#A78BFA'
const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`)
const relTime = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_STYLE: Record<Offer['status'], { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: 'Pending' },
  accepted: { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', label: 'Accepted ✓' },
  declined: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', label: 'Declined' },
}

interface Props {
  brand: string
  onScout: () => void
}

export default function SponsorOffersView({ brand, onScout }: Props) {
  useStoreVersion()
  const offers = listOffers({ brand })
  const campaigns = listCampaigns().filter(c => c.brand === brand)

  const accepted = offers.filter(o => o.status === 'accepted')
  const pending = offers.filter(o => o.status === 'pending')
  const committed = accepted.reduce((s, o) => s + o.amount, 0)

  if (offers.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <div className="text-4xl mb-4">📨</div>
        <div className="text-white/50 mb-1">No offers sent yet</div>
        <p className="text-white/30 text-sm mb-6 max-w-sm mx-auto">
          Scout an athlete and hit <span className="text-white/50">Send Offer</span>, or build a campaign to send several at once.
        </p>
        <button onClick={onScout} className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40` }}>
          Browse athletes →
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Offers Sent', val: String(offers.length), color: '#fff' },
          { label: 'Accepted',    val: String(accepted.length), color: '#22C55E' },
          { label: 'Pending',     val: String(pending.length), color: '#F97316' },
          { label: 'Committed',   val: money(committed), color: ACCENT },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="font-bold text-xl" style={{ color: s.color }}>{s.val}</div>
            <div className="text-white/35 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-3">Campaigns</div>
          <div className="space-y-2">
            {campaigns.map(c => {
              const co = offers.filter(o => o.campaignId === c.id)
              const acc = co.filter(o => o.status === 'accepted').length
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}22` }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-white/35 text-xs">{c.category} · {c.region} · {c.budgetBand}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-white/70 text-sm">{acc}/{co.length} accepted</div>
                  </div>
                  <button onClick={() => deleteCampaign(c.id)} className="text-white/20 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Offers */}
      <div className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-3">All Offers</div>
      <div className="space-y-2.5">
        {offers.map(o => <OfferRow key={o.id} o={o} />)}
      </div>
    </motion.div>
  )
}

// ── Expandable offer row with negotiation chat ────────────────────────────────
function OfferRow({ o }: { o: Offer }) {
  const [open, setOpen] = useState(false)
  const meta = DEAL_TYPE_META[o.dealType]
  const ss = STATUS_STYLE[o.status]
  const msgs = threadCount(o.id)
  const first = (o.athleteName || 'the athlete').split(' ')[0]
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">{o.athleteName || o.athleteId}</div>
          <div className="text-white/40 text-xs">{meta.icon} {meta.label} · {relTime(o.createdAt)} · 💬 {msgs}</div>
        </div>
        <div className="text-white font-bold text-sm flex-shrink-0">{money(o.amount)}</div>
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
        <span className="text-white/30 text-xs flex-shrink-0">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <ChatThread
            threadId={o.id} me="sponsor" otherName={o.athleteName || 'Athlete'} accent={ACCENT}
            placeholder={`Message ${first}…`}
            quickReplies={['Does this date work?', 'We can stretch the budget a little', 'Send me your rate']}
            maxHeight={240}
          />
        </div>
      )}
    </motion.div>
  )
}
