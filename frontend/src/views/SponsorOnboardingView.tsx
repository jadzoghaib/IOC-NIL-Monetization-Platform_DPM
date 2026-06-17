import { useState } from 'react'
import { motion } from 'framer-motion'
import { setSponsor, CATEGORIES } from '../lib/store'

const ACCENT = '#A78BFA'

interface Props {
  onDone: () => void
}

export default function SponsorOnboardingView({ onDone }: Props) {
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])

  const save = () => {
    if (!brand.trim()) return
    setSponsor({ brand: brand.trim(), primaryCategory: category })
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto py-16"
    >
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🏷️</div>
        <h2 className="font-display text-4xl text-white tracking-wide mb-2">WHO'S BUYING?</h2>
        <p className="text-white/40 text-sm">Tell us your brand so we can put it on the offers you send to athletes.</p>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.18)' }}>
        <div>
          <label className="text-[11px] text-white/40 uppercase tracking-wider">Brand name</label>
          <input
            value={brand} onChange={e => setBrand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="e.g. Nordic Performance Co."
            autoFocus
            className="w-full mt-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/40 transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] text-white/40 uppercase tracking-wider">Primary category</label>
          <select
            value={category} onChange={e => setCategory(e.target.value)}
            className="w-full mt-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/40"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={save} disabled={!brand.trim()}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: '#160d2e' }}
        >
          Start scouting →
        </motion.button>
      </div>
    </motion.div>
  )
}
