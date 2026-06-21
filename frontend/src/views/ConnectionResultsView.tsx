import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, SearchX, Trophy, RotateCcw } from 'lucide-react'
import type { useConnectionQuiz } from '../hooks/useConnectionQuiz'
import type { useFollows } from '../hooks/useFollows'
import { api } from '../lib/api'
import type { GamesKey, MatchResult } from '../lib/api'
import FollowButton from '../components/FollowButton'
import StarRating from '../components/StarRating'
import ShareButton from '../components/ShareButton'
import { buildMatchCard } from '../lib/shareCard'

const PERSONA_LABEL: Record<string, string> = {
  hype: 'The Hype Fan', grind: 'The Grind Believer', mix: 'The All-Rounder',
}

interface Props {
  quiz: ReturnType<typeof useConnectionQuiz>
  follows: ReturnType<typeof useFollows>
  games: GamesKey | null
  onViewProfile: (id: string) => void
}

export default function ConnectionResultsView({ quiz, follows, games, onViewProfile }: Props) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [diagnostics, setDiagnostics] = useState({ pool_size: 0, from_your_country: 0, your_sport: 0 })

  useEffect(() => {
    setLoading(true)
    api.match({
      games: games || undefined,
      country: quiz.profile.country || undefined,
      current_country: quiz.profile.current_country || undefined,
      childhood_sports: quiz.profile.childhood_sports,
      story_type: quiz.profile.story_type || undefined,
      personality: quiz.profile.personality || undefined,
      limit: 12,
    })
      .then(r => { setMatches(r.matches); setDiagnostics(r.diagnostics) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-center py-20 text-white/40">
        <Loader2 size={32} className="animate-spin mb-3 mx-auto" style={{ color: 'var(--text-faint)' }} />
        Finding your matches across {games === 'paris_2024' ? '~9,200' : '~2,200'} athletes...
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-20 text-white/40 max-w-md mx-auto">
        <SearchX size={48} className="mb-4 mx-auto opacity-35" style={{ color: 'var(--text-faint)' }} />
        <p className="mb-2">No matches found.</p>
        <button onClick={quiz.reset} className="text-gold hover:opacity-80 text-sm transition-opacity">
          ← Retake quiz
        </button>
      </div>
    )
  }

  const top = matches[0]
  const rest = matches.slice(1)

  return (
    <motion.div
      key="connection-results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
          YOUR MATCHES
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
          BUILT FOR YOU
        </h1>
        <p className="text-white/50 text-sm max-w-xl">
          {diagnostics.from_your_country > 0 && (
            <>{diagnostics.from_your_country} athletes from <span className="text-gold">{quiz.profile.country}</span> · </>
          )}
          {diagnostics.your_sport > 0 && (
            <>{diagnostics.your_sport} from your sport · </>
          )}
          {diagnostics.pool_size.toLocaleString()} athletes considered
        </p>

        <div className="mt-5">
          <ShareButton
            color={top.stars >= 4.5 ? '#FFD700' : top.stars >= 3.5 ? '#C0C0C0' : '#CD7F32'}
            title={`My Olympic Match: ${top.athlete.name}`}
            caption={`My top Olympic match is ${top.athlete.flag} ${top.athlete.name} (${top.athlete.sport}) on Podium · Olympics. Who's yours?`}
            filenameBase={`my-olympic-match-${top.athlete.name.toLowerCase().replace(/\s+/g, '-')}`}
            buttonLabel="Share my match"
            eventLabel="match"
            build={() => buildMatchCard({
              athleteName: top.athlete.name,
              flag: top.athlete.flag,
              country: top.athlete.country,
              sport: top.athlete.sport,
              stars: top.stars,
              reasons: top.reasons,
              persona: quiz.profile.personality ? PERSONA_LABEL[quiz.profile.personality] : undefined,
              color: top.stars >= 4.5 ? '#FFD700' : top.stars >= 3.5 ? '#C0C0C0' : '#CD7F32',
            })}
          />
        </div>
      </div>

      {/* TOP MATCH — hero card */}
      <TopMatchCard
        match={top}
        isFollowed={follows.isFollowed(top.athlete.id)}
        onToggleFollow={() => follows.toggle(top.athlete.id)}
        onViewProfile={() => onViewProfile(top.athlete.id)}
      />

      {/* OTHER MATCHES */}
      {rest.length > 0 && (
        <>
          <h2 className="font-display text-2xl text-white mt-12 mb-4">
            ALSO MATCHED FOR YOU
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rest.map((m, i) => (
              <SmallMatchCard
                key={m.athlete.id}
                match={m}
                isFollowed={follows.isFollowed(m.athlete.id)}
                onToggleFollow={() => follows.toggle(m.athlete.id)}
                onViewProfile={() => onViewProfile(m.athlete.id)}
                index={i}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-12 text-center">
        <button
          onClick={quiz.reset}
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
        >
          <RotateCcw size={14} /> Retake quiz
        </button>
      </div>
    </motion.div>
  )
}


// ── Hero card for the top match ──────────────────────────────────

function TopMatchCard({
  match, isFollowed, onToggleFollow, onViewProfile,
}: {
  match: MatchResult
  isFollowed: boolean
  onToggleFollow: () => void
  onViewProfile: () => void
}) {
  const a = match.athlete
  const tier = match.stars >= 4.5 ? '#FFD700' : match.stars >= 3.5 ? '#C0C0C0' : '#CD7F32'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative rounded-3xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
      style={{ border: `1px solid ${tier}40` }}
      onClick={onViewProfile}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: tier }} />

      {/* Athlete photo banner */}
      {a.thumbnail && (
        <div className="w-full h-44 sm:h-56 overflow-hidden relative">
          <img src={a.thumbnail} alt={a.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${tier}10 0%, var(--bg-card) 100%)` }} />
        </div>
      )}

      <div className="p-8" style={{ background: !a.thumbnail ? `linear-gradient(135deg, ${tier}18 0%, var(--bg-card) 100%)` : 'var(--bg-card)' }}>
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: tier }}>
              <Trophy size={14} /> YOUR TOP MATCH
            </p>
            {!a.thumbnail && <span className="text-5xl block mb-3">{a.flag}</span>}
            {a.thumbnail && <span className="text-2xl mr-2">{a.flag}</span>}
            <h2
              className="font-display leading-none mb-2"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: tier }}
            >
              {a.name.toUpperCase()}
            </h2>
            <p className="text-base text-white/60 mb-3">
              {a.country}{a.country && a.sport ? ' · ' : ''}{a.sport}
            </p>
            <StarRating stars={match.stars} size="md" showNumber />
          </div>
          <div onClick={e => e.stopPropagation()}>
            <FollowButton isFollowed={isFollowed} onToggle={onToggleFollow} />
          </div>
        </div>

        {/* Reasons */}
        <div className="flex flex-wrap gap-2 mt-5">
          {match.reasons.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: `${tier}15`, color: tier, border: `1px solid ${tier}30` }}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-white/30 mt-5">View full profile →</p>
      </div>
    </motion.div>
  )
}


// ── Compact card for other matches ──────────────────────────────

function SmallMatchCard({
  match, isFollowed, onToggleFollow, onViewProfile, index,
}: {
  match: MatchResult
  isFollowed: boolean
  onToggleFollow: () => void
  onViewProfile: () => void
  index: number
}) {
  const a = match.athlete
  const tierColor = match.stars >= 4.5 ? 'rgba(255, 215, 0, 0.30)'
                  : match.stars >= 3.5 ? 'rgba(192, 192, 192, 0.25)'
                  : 'rgba(255, 255, 255, 0.10)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.22 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl p-4 cursor-pointer border bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      style={{ borderColor: tierColor }}
      onClick={onViewProfile}
    >
      <div className="flex items-start gap-3">
        {a.thumbnail ? (
          <img src={a.thumbnail} alt={a.name}
            className="w-14 h-14 rounded-xl object-cover object-top flex-shrink-0 border border-white/10"
          />
        ) : (
          <span className="text-3xl shrink-0 w-14 text-center">{a.flag}</span>
        )}
        <div className="flex-1 min-w-0">
          {a.thumbnail && <span className="text-sm mr-1">{a.flag}</span>}
          <h3 className="font-display text-lg text-white leading-tight truncate">
            {a.name.toUpperCase()}
          </h3>
          <p className="text-xs text-white/40 truncate mb-1">
            {a.country} · {a.sport}
          </p>
          <StarRating stars={match.stars} size="xs" />
        </div>
        <div onClick={e => e.stopPropagation()}>
          <FollowButton isFollowed={isFollowed} onToggle={onToggleFollow} size="sm" />
        </div>
      </div>

      {match.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {match.reasons.slice(0, 3).map((r, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] text-white/60"
            >
              <span>{r.icon}</span>
              <span className="truncate max-w-[140px]">{r.label}</span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
