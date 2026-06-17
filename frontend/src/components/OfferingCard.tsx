import { motion } from 'framer-motion'
import type { Offering, LegacyOffering } from '../data/offerings'
import { CATEGORY_META } from '../data/offerings'
import { formatPrice } from '../lib/utils'

// ── Portfolio offering card (new design) ──────────────────────────────────────

interface PortfolioCardProps {
  offering: Offering
  index?: number
}

export function PortfolioOfferingCard({ offering, index = 0 }: PortfolioCardProps) {
  const meta   = CATEGORY_META[offering.category]
  const isHero = offering.highlight

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ y: -3 }}
      className="relative rounded-2xl overflow-hidden border flex flex-col"
      style={{
        borderColor: isHero ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.08)',
        background: isHero
          ? 'linear-gradient(145deg, rgba(255,215,0,0.07) 0%, rgba(13,13,43,0.97) 100%)'
          : 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: isHero ? '#FFD700' : meta.color, opacity: isHero ? 1 : 0.6 }}
      />

      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 gap-3"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}
      >
        {/* Icon + category */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
          >
            {offering.icon}
          </div>
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-widest block"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            {offering.badge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: isHero ? 'rgba(255,215,0,0.15)' : `${meta.color}18`,
                  color: isHero ? '#FFD700' : meta.color,
                  border: `1px solid ${isHero ? 'rgba(255,215,0,0.3)' : meta.color + '30'}`,
                }}
              >
                {offering.badge}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div
            className="font-bold text-base"
            style={{ color: isHero ? '#FFD700' : 'rgba(255,255,255,0.9)' }}
          >
            {formatPrice(offering.priceFrom)}+
          </div>
          <div className="text-white/30 text-[10px] leading-tight">{offering.priceUnit}</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex-1 flex flex-col">
        <h4 className="font-semibold text-white text-sm mb-0.5">{offering.title}</h4>
        <p
          className="text-xs italic mb-2.5"
          style={{ color: isHero ? 'rgba(255,215,0,0.6)' : `${meta.color}99` }}
        >
          {offering.tagline}
        </p>
        <p className="text-xs text-white/45 leading-relaxed flex-1">{offering.description}</p>
      </div>

      {/* Footer / CTA */}
      <div className="px-4 pb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all"
          style={
            isHero
              ? { background: 'linear-gradient(135deg,#FFD700 0%,#FF8C00 100%)', color: '#000' }
              : {
                  background: `${meta.color}14`,
                  color: meta.color,
                  border: `1px solid ${meta.color}35`,
                }
          }
        >
          {offering.cta} →
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Legacy card (kept for the original 48 hardcoded athletes) ─────────────────

interface LegacyCardProps {
  offering: LegacyOffering
  athleteName: string
  index?: number
}

export default function OfferingCard({ offering, athleteName, index = 0 }: LegacyCardProps) {
  const isSub = offering.type === 'subscription'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.1 }}
      className="rounded-2xl overflow-hidden border"
      style={{
        background: offering.sponsor
          ? 'linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(13,13,43,0.98) 100%)'
          : 'rgba(255,255,255,0.02)',
        borderColor: offering.sponsor ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {offering.sponsorLabel && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <span className="text-xs font-bold text-gold tracking-wider">✨ {offering.sponsorLabel}</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1 block">
              {isSub ? 'Monthly Subscription' : 'Custom Experience'}
            </span>
            <h4 className="font-semibold text-white leading-tight">{offering.title}</h4>
          </div>
          <div className="text-right shrink-0">
            <div className="text-gold font-bold text-lg">{formatPrice(offering.price)}</div>
            {isSub && <div className="text-white/30 text-xs">/ month</div>}
            {!isSub && offering.slotsAvailable !== undefined && (
              <div className="text-white/30 text-xs">{offering.slotsAvailable} slots left</div>
            )}
          </div>
        </div>
        <p className="text-xs text-white/50 leading-relaxed mb-4">{offering.description}</p>
        {offering.sponsor && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-gold/5 border border-gold/15">
            <span className="text-gold text-sm mt-0.5">💡</span>
            <p className="text-xs text-white/60 leading-relaxed">
              <span className="text-gold font-semibold">{athleteName.split(' ')[0]} earns twice</span> — from the{' '}
              {offering.sponsor} partnership AND your booking.
            </p>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={
            isSub
              ? { background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }
              : { background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)', color: '#000' }
          }
        >
          {isSub ? 'Subscribe' : 'Express Interest →'}
        </motion.button>
      </div>
    </motion.div>
  )
}
