import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Floating prototyping aid — jump between the three modes (and Home) from any
 * screen. Collapsible so it stays out of the way. To hide it in a polished
 * build, wrap <ModeSwitcher/> in App.tsx with `import.meta.env.DEV && ...`.
 */
const MODES = [
  { key: 'home',     label: 'Home',    emoji: '🏠', path: '/',         accent: '#FFD700', match: (p: string) => p === '/' },
  { key: 'fan',      label: 'Fan',     emoji: '🏅', path: '/fan',      accent: '#FFD700', match: (p: string) => p.startsWith('/fan') },
  { key: 'athlete',  label: 'Athlete', emoji: '🏃', path: '/athlete',  accent: '#2A9D8F', match: (p: string) => p.startsWith('/athlete') },
  { key: 'business', label: 'Sponsor', emoji: '🤝', path: '/business', accent: '#A78BFA', match: (p: string) => p.startsWith('/business') },
]

export default function ModeSwitcher() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(true)

  const current = MODES.find(m => m.match(pathname)) ?? MODES[0]

  return (
    <div className="fixed bottom-4 left-4 md:left-[216px] z-[80] flex flex-col items-start gap-1.5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-1 p-2 rounded-2xl backdrop-blur-xl"
            style={{ background: 'rgba(13,13,43,0.88)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.55)' }}
          >
            <div className="text-[8px] font-black uppercase tracking-[0.15em] text-white/30 px-1.5 pb-0.5">
              Prototype · Switch mode
            </div>
            {MODES.map(m => {
              const active = m.match(pathname)
              return (
                <button
                  key={m.key}
                  onClick={() => navigate(m.path)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all min-w-[120px]"
                  style={active
                    ? { background: `${m.accent}22`, color: m.accent, border: `1px solid ${m.accent}55` }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid transparent' }}
                >
                  <span className="text-base leading-none">{m.emoji}</span>
                  <span>{m.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: m.accent }} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse / expand toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-xl transition-all"
        style={{ background: 'rgba(13,13,43,0.88)', border: `1px solid ${current.accent}55`, color: current.accent, boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }}
        title="Toggle mode switcher"
      >
        <span>{current.emoji}</span>
        <span className="uppercase tracking-wider">{open ? '▾' : '▸'} {current.label}</span>
      </button>
    </div>
  )
}
