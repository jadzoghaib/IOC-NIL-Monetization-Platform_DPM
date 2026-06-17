import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Trophy, Compass, LayoutList, RotateCcw, Heart } from 'lucide-react'
import { useConnectionQuiz } from '../hooks/useConnectionQuiz'
import { useFollows } from '../hooks/useFollows'
import GamesPickerView from '../views/GamesPickerView'
import EntryChoiceView from '../views/EntryChoiceView'
import ConnectionQuizView from '../views/ConnectionQuizView'
import ConnectionResultsView from '../views/ConnectionResultsView'
import DiscoverView from '../views/DiscoverView'
import AthleteProfileView from '../views/AthleteProfileView'
import MyFeedView from '../views/MyFeedView'
import SideNav from '../components/SideNav'
import TopNav from '../components/TopNav'
import type { SideNavItem } from '../components/SideNav'
import type { GamesKey } from '../lib/api'

type Tab = 'quiz' | 'results' | 'discover' | 'feed' | 'profile'
type Stage = 'games' | 'entry' | 'app'

const ACCENT = '#FFD700'

const GAMES_LABEL: Record<GamesKey, { name: string; flag: string }> = {
  paris_2024: { name: 'Paris 2024',          flag: '🇫🇷' },
  milan_2026: { name: 'Milano-Cortina 2026', flag: '🇮🇹' },
}

export default function FanEngagement() {
  const quiz = useConnectionQuiz()
  const follows = useFollows()
  const [sideNavOpen, setSideNavOpen] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const quickGames = params.get('games') as GamesKey | null
  const quickView  = params.get('view') as Tab | null

  const [stage, setStage] = useState<Stage>(quickGames ? 'app' : 'games')
  const [games, setGames] = useState<GamesKey | null>(quickGames)
  const [tab, setTab] = useState<Tab>(quickView ?? 'quiz')
  const [viewingAthlete, setViewingAthlete] = useState<string | null>(null)
  const [prevTab, setPrevTab] = useState<Tab>('quiz')

  const openProfile = (id: string) => { setPrevTab(tab); setViewingAthlete(id); setTab('profile') }
  const closeProfile = () => { setViewingAthlete(null); setTab(prevTab) }
  const handleGamesPicked = (g: GamesKey) => { setGames(g); setStage('entry') }
  const handleQuiz   = () => { setTab('quiz');     setStage('app') }
  const handleBrowse = () => { setTab('discover'); setStage('app') }
  const handleBackToGames = () => { setStage('games'); setGames(null); quiz.reset() }

  const activeTab = tab === 'profile' ? prevTab : tab
  const showResults = quiz.isDone || quiz.step === 'done'

  // ── Entry stages — no sidebar ──────────────────────────────────────────
  if (stage === 'games' || stage === 'entry') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .4s, color .4s' }}>
        <TopNav />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {stage === 'games' && <GamesPickerView key="games" onPick={handleGamesPicked} showSteps />}
            {stage === 'entry' && games && (
              <EntryChoiceView key="entry" games={games} onTakeQuiz={handleQuiz} onBrowse={handleBrowse} onBack={handleBackToGames} />
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ── Main app — with sidebar ────────────────────────────────────────────
  const navItems: SideNavItem[] = [
    { id: 'quiz',     label: 'My Match', icon: <Trophy size={16} /> },
    { id: 'discover', label: 'Discover', icon: <Compass size={16} /> },
    { id: 'feed',     label: 'My Wall',  icon: <LayoutList size={16} />, badge: follows.followed.length || undefined },
  ]

  const sideFooter = games ? (
    <button
      onClick={handleBackToGames}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors text-xs"
      style={{ color: 'var(--text-faint)' }}
    >
      <span>{GAMES_LABEL[games].flag}</span>
      <span className="flex-1 truncate">{GAMES_LABEL[games].name}</span>
      <RotateCcw size={11} />
    </button>
  ) : undefined

  const navExtra = (
    <>
      {games && (
        <button
          onClick={handleBackToGames}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>{GAMES_LABEL[games].flag}</span>
          <span>{GAMES_LABEL[games].name}</span>
          <RotateCcw size={10} style={{ marginLeft: 2 }} />
        </button>
      )}
      {follows.followed.length > 0 && (
        <button
          onClick={() => { setViewingAthlete(null); setTab('feed') }}
          className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={activeTab === 'feed' ? { background: `${ACCENT}15`, color: ACCENT } : { color: 'var(--text-faint)' }}
        >
          <LayoutList size={13} />
          <span className="text-[10px]">{follows.followed.length}</span>
        </button>
      )}
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .4s, color .4s' }}>
      <TopNav onMenuOpen={() => setSideNavOpen(true)} extra={navExtra} />

      <div className="flex" style={{ minHeight: 'calc(100vh - 68px)' }}>
        <SideNav
          accent={ACCENT}
          modeIcon={<Heart size={14} />}
          modeLabel="Fan Mode"
          items={navItems}
          active={activeTab}
          onSelect={(id) => { setViewingAthlete(null); setTab(id as Tab) }}
          footer={sideFooter}
          open={sideNavOpen}
          onClose={() => setSideNavOpen(false)}
        />

        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <AnimatePresence mode="wait">
              {tab === 'quiz' && !showResults && (
                <ConnectionQuizView key="quiz" quiz={quiz} games={games} />
              )}
              {tab === 'quiz' && showResults && (
                <ConnectionResultsView key="results" quiz={quiz} follows={follows} games={games} onViewProfile={openProfile} />
              )}
              {tab === 'discover' && (
                <DiscoverView key="discover" follows={follows} onViewProfile={openProfile} games={games || undefined} />
              )}
              {tab === 'feed' && (
                <MyFeedView key="feed" follows={follows} onViewProfile={openProfile} onGoDiscover={() => setTab('discover')} />
              )}
              {tab === 'profile' && viewingAthlete && (
                <AthleteProfileView key={`profile-${viewingAthlete}`} athleteId={viewingAthlete} follows={follows} onBack={closeProfile} />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
