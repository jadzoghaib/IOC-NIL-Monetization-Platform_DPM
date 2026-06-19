import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Handshake, Compass, Target, Send, BarChart3, ShieldCheck, ClipboardList, Sparkles, Bookmark, RotateCcw, ArrowLeft } from 'lucide-react'
import type { GamesKey } from '../lib/api'
import { useStoreVersion, getSponsor, setSponsor, listOffers } from '../lib/store'
import GamesPickerView from '../views/GamesPickerView'
import BusinessDiscoverView from '../views/BusinessDiscoverView'
import BusinessAthleteView from '../views/BusinessAthleteView'
import SponsorOnboardingView from '../views/SponsorOnboardingView'
import CampaignBuilderView from '../views/CampaignBuilderView'
import SponsorOffersView from '../views/SponsorOffersView'
import SideNav from '../components/SideNav'
import TopNav from '../components/TopNav'
import type { SideNavItem } from '../components/SideNav'

type View = 'roster' | 'athlete' | 'campaign' | 'offers'

const GAMES_LABEL: Record<GamesKey, { name: string; flag: string }> = {
  paris_2024: { name: 'Paris 2024',          flag: '🇫🇷' },
  milan_2026: { name: 'Milano-Cortina 2026', flag: '🇮🇹' },
}

const ACCENT = '#A78BFA'

const FEATURE_CHIPS = [
  { icon: <BarChart3 size={13} />,     label: 'Marketability Score' },
  { icon: <Target size={13} />,        label: 'Brand-Fit Ranking' },
  { icon: <ShieldCheck size={13} />,   label: 'Brand Safety' },
  { icon: <ClipboardList size={13} />, label: 'Category Availability' },
  { icon: <Send size={13} />,          label: 'Send Offers' },
  { icon: <Sparkles size={13} />,      label: 'Deal Estimates' },
]

const ModeChipEl = () => (
  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
    style={{ background: 'rgba(167,139,250,0.12)', color: ACCENT, border: '1px solid rgba(167,139,250,0.25)' }}>
    <Handshake size={11} /> Sponsorship
  </div>
)

export default function BusinessMode() {
  useStoreVersion()
  const sponsor = getSponsor()
  const [games, setGames] = useState<GamesKey | null>(null)
  const [view, setView]   = useState<View>('roster')
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [sideNavOpen, setSideNavOpen] = useState(false)

  const openAthlete = (id: string) => { setAthleteId(id); setView('athlete') }
  const backToRoster = () => { setAthleteId(null); setView('roster') }
  const goTo = (v: View) => { setAthleteId(null); setView(v) }

  const pendingOffers = sponsor.brand ? listOffers({ brand: sponsor.brand }).filter(o => o.status === 'pending').length : 0

  const pageStyle = { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .4s, color .4s' }

  // ── Games picker ────────────────────────────────────────────────────────────
  if (!games) {
    return (
      <div style={pageStyle}>
        <TopNav extra={<ModeChipEl />} />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
              style={{ background: 'rgba(167,139,250,0.1)', color: ACCENT, border: '1px solid rgba(167,139,250,0.2)' }}>
              <Handshake size={12} /> Partner Scouting
            </div>
            <h1 className="font-display text-5xl sm:text-6xl mb-4 tracking-wide" style={{ color: 'var(--text)' }}>
              FIND YOUR<br /><span style={{ color: ACCENT }}>CHAMPION PARTNER</span>
            </h1>
            <p className="max-w-lg mx-auto text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Scout every Olympic athlete by sponsorship metrics, build a campaign brief, and send
              partnership offers in a click — straight to the athlete's inbox.
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

  // ── Brand setup gate ──────────────────────────────────────────────────────────
  if (!sponsor.brand) {
    return (
      <div style={pageStyle}>
        <TopNav extra={<ModeChipEl />} />
        <div className="max-w-6xl mx-auto px-4">
          <SponsorOnboardingView onDone={() => setView('roster')} />
        </div>
      </div>
    )
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  const navItems: SideNavItem[] = [
    { id: 'roster',   label: 'Scout Athletes',   icon: <Compass size={16} /> },
    { id: 'campaign', label: 'Campaign Builder', icon: <Target size={16} /> },
    { id: 'offers',   label: 'My Offers',        icon: <Send size={16} />, badge: pendingOffers || undefined },
  ]

  const sideFooter = (
    <div className="space-y-2">
      <button
        onClick={() => setGames(null)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors text-xs"
        style={{ color: 'var(--text-faint)' }}
      >
        <span>{GAMES_LABEL[games].flag}</span>
        <span className="flex-1 truncate">{GAMES_LABEL[games].name}</span>
        <RotateCcw size={11} />
      </button>
      {sponsor.brand && (
        <button
          onClick={() => { if (confirm('Switch brand? Your sent offers stay saved.')) setSponsor({ brand: '' }) }}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors text-xs truncate"
          style={{ color: 'var(--text-faint)' }}
        >
          <Bookmark size={11} className="flex-shrink-0" />
          <span className="truncate">{sponsor.brand}</span>
        </button>
      )}
    </div>
  )

  return (
    <div style={pageStyle}>
      <TopNav onMenuOpen={() => setSideNavOpen(true)} extra={<ModeChipEl />} />

      <div className="flex" style={{ minHeight: 'calc(100vh - 68px)' }}>
        <SideNav
          accent={ACCENT}
          modeIcon={<Handshake size={14} />}
          modeLabel="Sponsor Mode"
          items={navItems}
          active={view === 'athlete' ? 'roster' : view}
          onSelect={(id) => goTo(id as View)}
          footer={sideFooter}
          open={sideNavOpen}
          onClose={() => setSideNavOpen(false)}
        />

        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {view === 'athlete' && (
              <button onClick={backToRoster}
                className="flex items-center gap-2 text-sm mb-6 transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft size={14} /> Scout Athletes
              </button>
            )}
            {view === 'roster' && (
              <div className="mb-6">
                <h2 className="font-display text-3xl" style={{ color: 'var(--text)' }}>
                  ATHLETE ROSTER
                  <span className="ml-3 text-sm font-sans font-normal normal-case tracking-normal" style={{ color: 'var(--text-faint)' }}>
                    {GAMES_LABEL[games].flag} {GAMES_LABEL[games].name}
                  </span>
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Click any athlete to see full sponsorship metrics and send an offer.</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {view === 'roster' && <BusinessDiscoverView key="roster" onViewAthlete={openAthlete} games={games} />}
              {view === 'athlete' && athleteId && <BusinessAthleteView key={`athlete-${athleteId}`} athleteId={athleteId} onBack={backToRoster} />}
              {view === 'campaign' && <CampaignBuilderView key="campaign" games={games} brand={sponsor.brand} defaultCategory={sponsor.primaryCategory} onSent={() => goTo('offers')} />}
              {view === 'offers' && <SponsorOffersView key="offers" brand={sponsor.brand} onScout={() => goTo('roster')} />}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
