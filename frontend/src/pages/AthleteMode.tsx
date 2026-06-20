import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ArrowLeft, LayoutDashboard, SquarePen, Briefcase, LayoutList, Send, Zap, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import type { GamesKey } from '../lib/api'
import GamesPickerView from '../views/GamesPickerView'
import AthleteRosterView from '../views/AthleteRosterView'
import AthleteManageView from '../views/AthleteManageView'
import SideNav from '../components/SideNav'
import TopNav from '../components/TopNav'
import AIAssistant from '../components/AIAssistant'
import type { SideNavItem } from '../components/SideNav'

const GAMES_LABEL: Record<GamesKey, { name: string; flag: string }> = {
  paris_2024: { name: 'Paris 2024',          flag: '🇫🇷' },
  milan_2026: { name: 'Milano-Cortina 2026', flag: '🇮🇹' },
}

const ACCENT = '#2A9D8F'

const FEATURE_CHIPS = [
  { icon: <SquarePen size={13} />, label: 'Post Content' },
  { icon: <Briefcase size={13} />, label: 'Design Courses' },
  { icon: <LayoutList size={13} />, label: 'Set Availability' },
  { icon: <Send size={13} />, label: 'Field Sponsor Offers' },
]

export default function AthleteMode() {
  const [games, setGames] = useState<GamesKey | null>(null)
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState<string>('')
  const [athleteSport, setAthleteSport] = useState<string>('')
  const [sideNavOpen, setSideNavOpen] = useState(false)

  const pageStyle = { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .4s, color .4s' }

  // ── Games picker ────────────────────────────────────────────────────────────
  if (!games) {
    return (
      <div style={pageStyle}>
        <TopNav extra={
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
            style={{ background: 'rgba(42,157,143,0.14)', color: ACCENT, border: `1px solid rgba(42,157,143,0.3)` }}>
            <Zap size={11} /> Athlete
          </div>
        } />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
              style={{ background: 'rgba(42,157,143,0.1)', color: ACCENT, border: `1px solid rgba(42,157,143,0.2)` }}>
              <Zap size={12} /> Athlete Studio
            </div>
            <h1 className="font-display text-5xl sm:text-6xl mb-4 tracking-wide" style={{ color: 'var(--text)' }}>
              BUILD YOUR<br /><span style={{ color: ACCENT }}>FAN ECONOMY</span>
            </h1>
            <p className="max-w-lg mx-auto text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Pick a Games, choose any athlete, and manage their content, courses, availability,
              and sponsorship offers — all in one studio.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-10">
            {FEATURE_CHIPS.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {icon} {label}
              </div>
            ))}
          </motion.div>
          <GamesPickerView onPick={setGames} />
        </div>
      </div>
    )
  }

  // ── Main app — with sidebar ──────────────────────────────────────────────
  const navItems: SideNavItem[] = athleteId
    ? [
        { id: 'roster', label: 'All Athletes', icon: <ArrowLeft size={16} /> },
        { id: '_ctx', label: athleteName || 'Managing…', icon: <LayoutDashboard size={16} />, muted: true },
      ]
    : [
        { id: 'roster', label: 'Select Athlete', icon: <Users size={16} /> },
      ]

  const sideFooter = (
    <button
      onClick={() => { setGames(null); setAthleteId(null); setAthleteName('') }}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors text-xs"
      style={{ color: 'var(--text-faint)' }}
    >
      <span>{GAMES_LABEL[games].flag}</span>
      <span className="flex-1 truncate">{GAMES_LABEL[games].name}</span>
      <RotateCcw size={11} />
    </button>
  )

  return (
    <div style={pageStyle}>
      <TopNav
        onMenuOpen={() => setSideNavOpen(true)}
        extra={
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
            style={{ background: 'rgba(42,157,143,0.14)', color: ACCENT, border: `1px solid rgba(42,157,143,0.3)` }}>
            <Zap size={11} /> Athlete
          </div>
        }
      />

      <div className="flex" style={{ minHeight: 'calc(100vh - 68px)' }}>
        <SideNav
          accent={ACCENT}
          modeIcon={<Zap size={14} />}
          modeLabel="Athlete Studio"
          items={navItems}
          active={athleteId ? '' : 'roster'}
          onSelect={(id) => { if (id === 'roster') { setAthleteId(null); setAthleteName('') } }}
          footer={sideFooter}
          open={sideNavOpen}
          onClose={() => setSideNavOpen(false)}
        />

        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            {!athleteId && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h2 className="font-display text-3xl" style={{ color: 'var(--text)' }}>
                  SELECT AN ATHLETE
                  <span className="ml-3 text-sm font-sans font-normal normal-case tracking-normal" style={{ color: 'var(--text-faint)' }}>
                    {GAMES_LABEL[games].flag} {GAMES_LABEL[games].name}
                  </span>
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Choose whose studio you want to manage.</p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {!athleteId ? (
                <AthleteRosterView key="roster" games={games} onPick={(id) => {
                  setAthleteId(id)
                  api.getAthlete(id).then(r => { setAthleteName(r.name); setAthleteSport(r.sport) }).catch(() => {})
                }} />
              ) : (
                <AthleteManageView key={`manage-${athleteId}`} athleteId={athleteId} onBack={() => { setAthleteId(null); setAthleteName(''); setAthleteSport('') }} />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {athleteId && (
        <AIAssistant
          mode="athlete"
          managingAthleteId={athleteId}
          managingAthleteName={athleteName}
          managingAthleteSport={athleteSport}
          onNavigateTo={() => {/* AthleteManageView handles internal nav */}}
        />
      )}
    </div>
  )
}
