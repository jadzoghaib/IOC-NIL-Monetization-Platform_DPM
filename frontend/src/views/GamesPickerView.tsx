import { motion } from 'framer-motion'
import type { GamesKey } from '../lib/api'

interface Props {
  onPick: (games: GamesKey) => void
  showSteps?: boolean
}

const GAMES = [
  {
    key: 'paris_2024' as GamesKey,
    flag: '🇫🇷',
    countryCode: 'FR',
    label: 'Paris 2024',
    sub: 'Summer Olympics',
    season: 'Summer',
    color: '#E63946',
    accent: '#FFD700',
    athletes: '~9,200 athletes · 35 sports',
  },
  {
    key: 'milan_2026' as GamesKey,
    flag: '🇮🇹',
    countryCode: 'IT',
    label: 'Milano-Cortina 2026',
    sub: 'Winter Olympics',
    season: 'Winter',
    color: '#457B9D',
    accent: '#A8DADC',
    athletes: '~2,200 athletes · 16 sports',
  },
]

export default function GamesPickerView({ onPick, showSteps }: Props) {
  return (
    <motion.div
      key="games-picker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] flex flex-col items-center justify-center max-w-4xl mx-auto"
    >
      {showSteps && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3"
        >
          STEP 1 OF 2
        </motion.p>
      )}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="font-display text-5xl md:text-6xl text-white text-center mb-3"
      >
        PICK YOUR GAMES
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-white/40 text-center mb-12 max-w-md"
      >
        Choose which Olympics you want to explore. We'll match you with athletes from there.
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {GAMES.map((g, i) => (
          <motion.button
            key={g.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.1 }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPick(g.key)}
            className="relative rounded-3xl p-8 text-left overflow-hidden group"
            style={{
              background: `linear-gradient(135deg, ${g.color}14 0%, var(--bg-card) 100%)`,
              border: `1px solid ${g.color}40`,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${g.color} 0%, ${g.accent} 100%)` }}
            />
            <div className="absolute bottom-2 right-4 font-display select-none pointer-events-none"
              style={{ fontSize: '7rem', lineHeight: 1, color: g.color, opacity: 0.07 }}>
              {g.countryCode}
            </div>

            <div className="text-7xl mb-4">{g.flag}</div>

            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: g.accent }}
            >
              {g.season} · OLYMPICS
            </p>
            <h2
              className="font-display leading-none mb-2"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: g.color }}
            >
              {g.label.toUpperCase()}
            </h2>

            <p className="text-white/40 text-sm mb-6">{g.athletes}</p>

            <div
              className="inline-flex items-center gap-2 text-sm font-semibold transition-transform group-hover:translate-x-1"
              style={{ color: g.accent }}
            >
              Explore →
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
