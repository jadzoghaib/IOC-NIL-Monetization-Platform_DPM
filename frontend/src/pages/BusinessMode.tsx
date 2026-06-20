import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Handshake, Compass, Target, Send, BarChart3, ShieldCheck, ClipboardList, Sparkles, Bookmark, ArrowLeft, Globe } from 'lucide-react'
import type { GamesKey } from '../lib/api'
import { useStoreVersion, getSponsor, setSponsor, listOffers } from '../lib/store'
import BusinessDiscoverView from '../views/BusinessDiscoverView'
import BusinessAthleteView from '../views/BusinessAthleteView'
import SponsorOnboardingView from '../views/SponsorOnboardingView'
import CampaignBuilderView from '../views/CampaignBuilderView'
import SponsorOffersView from '../views/SponsorOffersView'
import SideNav from '../components/SideNav'
import TopNav from '../components/TopNav'
import AIAssistant from '../components/AIAssistant'
import type { SideNavItem } from '../components/SideNav'

type View = 'roster' | 'athlete' | 'campaign' | 'offers'

// Sponsors scout BOTH Olympics by default — a campaign can mix summer + winter
// athletes. 'all' means no Games filter (both); the two keys narrow it.
type GamesFilter = 'all' | GamesKey

const GAMES_LABEL: Record<GamesKey, { name: string; flag: string }> = {
  paris_2024: { name: 'Paris 2024',          flag: '🇫🇷' },
  milan_2026: { name: 'Milano-Cortina 2026', flag: '🇮🇹' },
}

const GAMES_FILTERS: { key: GamesFilter; label: string; short: string }[] = [
  { key: 'all',        label: 'All Olympics',              short: 'All' },
  { key: 'paris_2024', label: '🇫🇷 Paris 2024',           short: '🇫🇷 Summer' },
  { key: 'milan_2026', label: '🇮🇹 Milano-Cortina 2026',  short: '🇮🇹 Winter' },
]

const ACCENT = '#A78BFA'

function GamesSegmented({ value, onChange }: { value: GamesFilter; onChange: (g: GamesFilter) => void }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      {GAMES_FILTERS.map(g => (
        <button key={g.key} onClick={() => onChange(g.key)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={value === g.key
            ? { background: 'rgba(167,139,250,0.18)', color: ACCENT }
            : { background: 'transparent', color: 'var(--text-faint)' }}>
          {g.key === 'all' ? <><Globe size={11} className="inline mr-1" />{g.short}</> : g.short}
        </button>
      ))}
    </div>
  )
}

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
  const [gamesFilter, setGamesFilter] = useState<GamesFilter>('all')
  const games: GamesKey | undefined = gamesFilter === 'all' ? undefined : gamesFilter
  const [view, setView]   = useState<View>('roster')
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [sideNavOpen, setSideNavOpen] = useState(false)

  const openAthlete = (id: string) => { setAthleteId(id); setView('athlete') }
  const backToRoster = () => { setAthleteId(null); setView('roster') }
  const goTo = (v: View) => { setAthleteId(null); setView(v) }

  const pendingOffers = sponsor.brand ? listOffers({ brand: sponsor.brand }).filter(o => o.status === 'pending').length : 0

  const pageStyle = { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .4s, color .4s' }

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
      <div className="px-1">
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-faint)' }}>Games</div>
        <div className="flex flex-col gap-1">
          {GAMES_FILTERS.map(g => (
            <button key={g.key} onClick={() => setGamesFilter(g.key)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors"
              style={gamesFilter === g.key
                ? { background: 'rgba(167,139,250,0.16)', color: ACCENT }
                : { background: 'transparent', color: 'var(--text-faint)' }}>
              {g.label}
            </button>
          ))}
        </div>
      </div>
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
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h2 className="font-display text-3xl" style={{ color: 'var(--text)' }}>
                    ATHLETE ROSTER
                    <span className="ml-3 text-sm font-sans font-normal normal-case tracking-normal" style={{ color: 'var(--text-faint)' }}>
                      {games ? `${GAMES_LABEL[games].flag} ${GAMES_LABEL[games].name}` : '🌐 All Olympics — Summer + Winter'}
                    </span>
                  </h2>
                  <GamesSegmented value={gamesFilter} onChange={setGamesFilter} />
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Scout both Olympics by default — filter by Games above. Click any athlete for full sponsorship metrics.</p>
              </div>
            )}
            {view === 'campaign' && (
              <div className="mb-4 flex items-center justify-end">
                <GamesSegmented value={gamesFilter} onChange={setGamesFilter} />
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

      <AIAssistant
        mode="business"
        brandName={sponsor.brand}
        brandCategory={sponsor.primaryCategory}
        onViewProfile={(id) => { openAthlete(id) }}
        onNavigateTo={(section) => {
          if (['roster', 'campaign', 'offers'].includes(section)) goTo(section as View)
        }}
      />
    </div>
  )
}
