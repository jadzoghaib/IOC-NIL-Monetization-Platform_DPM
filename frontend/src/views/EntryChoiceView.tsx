import { motion } from 'framer-motion'
import type { GamesKey } from '../lib/api'

interface Props {
  games: GamesKey
  onTakeQuiz: () => void
  onBrowse: () => void
  onBack: () => void
}

const GAMES_LABEL: Record<GamesKey, { name: string; flag: string; color: string }> = {
  paris_2024:  { name: 'Paris 2024',          flag: '🇫🇷', color: '#E63946' },
  milan_2026:  { name: 'Milano-Cortina 2026', flag: '🇮🇹', color: '#457B9D' },
}

export default function EntryChoiceView({ games, onTakeQuiz, onBrowse, onBack }: Props) {
  const meta = GAMES_LABEL[games]

  return (
    <motion.div
      key="entry-choice"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] flex flex-col items-center justify-center max-w-4xl mx-auto"
    >
      <button
        onClick={onBack}
        className="self-start text-white/30 hover:text-white/70 text-sm transition-colors mb-6"
      >
        ← Change games
      </button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
        style={{ background: `${meta.color}18`, color: meta.color }}
      >
        {meta.flag} {meta.name}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3"
      >
        STEP 2 OF 2
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-5xl md:text-6xl text-white text-center mb-3"
      >
        HOW DO YOU WANT TO START?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/40 text-center mb-12 max-w-lg"
      >
        Two ways in: let our quiz match your values to an athlete, or browse the full roster yourself.
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Quiz */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onTakeQuiz}
          className="relative rounded-3xl p-8 text-left overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.13) 0%, var(--bg-card) 100%)',
            border: '1px solid rgba(255,215,0,0.3)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gold" />

          <div className="text-6xl mb-4">🎯</div>

          <p className="text-xs font-semibold uppercase tracking-widest text-gold/80 mb-1">
            45 SECONDS · 7 QUESTIONS
          </p>
          <h2 className="font-display text-4xl text-gold mb-3">
            TAKE THE QUIZ
          </h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            Answer 7 questions about what motivates you and how you experience sport.
            We'll match you to one of 12 Olympic archetypes — and the athlete who lives them.
          </p>

          <div className="inline-flex items-center gap-2 text-sm font-semibold text-gold transition-transform group-hover:translate-x-1">
            Start the quiz →
          </div>
        </motion.button>

        {/* Browse */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBrowse}
          className="relative rounded-3xl p-8 text-left overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, rgba(78,205,196,0.13) 0%, var(--bg-card) 100%)',
            border: '1px solid rgba(78,205,196,0.3)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#4ECDC4' }} />

          <div className="text-6xl mb-4">🔭</div>

          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#4ECDC4' }}>
            FULL ROSTER
          </p>
          <h2 className="font-display text-4xl mb-3" style={{ color: '#4ECDC4' }}>
            BROWSE ATHLETES
          </h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            Explore every athlete from the Games. Filter by sport, country, or star rating —
            from medal favorites to viral underdogs (looking at you, Raygun).
          </p>

          <div
            className="inline-flex items-center gap-2 text-sm font-semibold transition-transform group-hover:translate-x-1"
            style={{ color: '#4ECDC4' }}
          >
            Browse the roster →
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
}
