/**
 * ⚠️ LEGACY / UNUSED — paired with the original 8-archetype QuizView. The live
 * Fan flow uses ConnectionResultsView (see FanEngagement.tsx). Kept for reference
 * only; not imported by any routed page. Safe to delete.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { useQuiz } from '../hooks/useQuiz'
import type { useFollows } from '../hooks/useFollows'
import { ARCHETYPES, ARCHETYPE_SPONSORS, ARCHETYPE_DIST, getArchetypeKey } from '../data/archetypes'
import { getAthletesByArchetype } from '../data/athletes'
import { getOfferings } from '../data/offerings'
import FollowButton from '../components/FollowButton'
import OfferingCard from '../components/OfferingCard'
import ShareButton from '../components/ShareButton'
import { buildArchetypeCard } from '../lib/shareCard'
import { trackEvent } from '../lib/store'

interface Props {
  quiz: ReturnType<typeof useQuiz>
  follows: ReturnType<typeof useFollows>
  onViewProfile: (id: string) => void
}

const REFERRAL_TIERS = [
  { count: 1, label: 'Behind-the-scenes training content from your matched athlete\'s sport' },
  { count: 3, label: 'Your sponsor\'s personalized fan reward' },
  { count: 5, label: 'Early access to LA 2028 exclusive content drops' },
  { count: 10, label: 'VIP Olympic experience package — event tickets or athlete meet-and-greet ballot' },
]

export default function ResultsView({ quiz, follows, onViewProfile }: Props) {
  useEffect(() => {
    if (!quiz.isDone) return
    const [m, e] = quiz.getArchetypeKey()
    const arch = ARCHETYPES[getArchetypeKey(m, e)]
    if (arch) trackEvent('quiz_completed', { archetype: arch.name })
  }, [quiz.isDone])

  if (!quiz.isDone && quiz.step < 7) return null

  const [mot, eng] = quiz.getArchetypeKey()
  const archetypeKey = getArchetypeKey(mot, eng)
  const archetype = ARCHETYPES[archetypeKey]
  const sponsor = ARCHETYPE_SPONSORS[archetypeKey]
  const athletesInArchetype = getAthletesByArchetype(mot, eng)
  const matchedAthlete = athletesInArchetype[quiz.playerSeed % athletesInArchetype.length]
  const offerings = matchedAthlete ? getOfferings(matchedAthlete.id) : []

  if (!archetype || !matchedAthlete) return null

  const color = archetype.color

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Archetype reveal */}
      <div
        className="relative rounded-3xl p-8 mb-8 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}18 0%, rgba(13,13,43,0.98) 100%)`, border: `1px solid ${color}35` }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2"
        >
          YOUR OLYMPIC ARCHETYPE
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="font-display leading-none mb-3"
          style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', color }}
        >
          {archetype.emoji} {archetype.name.toUpperCase()}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-white/60 italic mb-4"
        >
          "{archetype.tagline}"
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/70 leading-relaxed max-w-2xl mb-4"
        >
          {archetype.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: `${color}18`, color }}
        >
          📊 {archetype.dataInsight}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-6"
        >
          <ShareButton
            color={color}
            title={`My Olympic Archetype: ${archetype.name}`}
            caption={`I'm ${archetype.emoji} ${archetype.name} — my Olympic fan archetype on My Match · Olympics. "${archetype.tagline}" What's yours?`}
            filenameBase={`my-olympic-archetype-${archetype.name.toLowerCase().replace(/\s+/g, '-')}`}
            buttonLabel="Share my archetype"
            eventLabel="archetype"
            build={() => buildArchetypeCard({
              name: archetype.name,
              emoji: archetype.emoji,
              color,
              tagline: archetype.tagline,
              distPct: ARCHETYPE_DIST[archetype.name],
              athleteName: matchedAthlete.name,
            })}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Athlete match */}
        <div>
          <h2 className="font-display text-2xl text-white mb-4">🏅 YOUR MATCHED ATHLETE</h2>

          {/* Main match card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-6 mb-4 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${color}14 0%, rgba(13,13,43,0.98) 100%)`, border: `1px solid ${color}30` }}
            onClick={() => onViewProfile(matchedAthlete.id)}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-5xl">{matchedAthlete.flag}</span>
                <h3 className="font-display text-3xl text-white mt-2">{matchedAthlete.name.toUpperCase()}</h3>
                <p className="text-sm mt-0.5" style={{ color: `${color}CC` }}>
                  {matchedAthlete.country} · {matchedAthlete.sport}
                </p>
              </div>
              <FollowButton
                isFollowed={follows.isFollowed(matchedAthlete.id)}
                onToggle={() => follows.toggle(matchedAthlete.id)}
              />
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-3">{matchedAthlete.story}</p>
            <p className="text-xs font-semibold" style={{ color }}>View full profile →</p>
          </motion.div>

          {/* Other athletes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Also in your archetype</p>
            {athletesInArchetype
              .filter(a => a.id !== matchedAthlete.id)
              .map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/6 hover:border-white/15 transition-colors cursor-pointer"
                  onClick={() => onViewProfile(a.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{a.flag}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{a.name}</p>
                      <p className="text-xs text-white/40">{a.country} · {a.sport}</p>
                    </div>
                  </div>
                  <FollowButton isFollowed={follows.isFollowed(a.id)} onToggle={() => follows.toggle(a.id)} size="sm" />
                </motion.div>
              ))}
          </div>
        </div>

        {/* Right: Sponsor + Offerings + Referral */}
        <div>
          {/* Sponsor */}
          <h2 className="font-display text-2xl text-white mb-4">🤝 YOUR SPONSOR MATCH</h2>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-5 mb-6 border border-gold/20 bg-gold/[0.04]"
          >
            <h3 className="font-display text-2xl text-gold mb-0.5">{sponsor.brand.toUpperCase()}</h3>
            <p className="text-xs text-white/30 mb-3">{sponsor.tier}</p>
            <p className="text-sm text-white/60 mb-1.5"><span className="text-white/50 font-medium">Campaign:</span> {sponsor.activation}</p>
            <p className="text-sm text-white/60 mb-1.5"><span className="text-white/50 font-medium">Your reward:</span> {sponsor.fanReward}</p>
            <p className="text-sm text-white/60"><span className="text-white/50 font-medium">Refer & unlock:</span> {sponsor.referralReward}</p>
          </motion.div>

          {/* Offerings */}
          <h2 className="font-display text-2xl text-white mb-4">🎁 {matchedAthlete.name.split(' ')[0]}'s OFFERINGS</h2>
          <div className="space-y-3 mb-6">
            {offerings.map((o, i) => (
              <OfferingCard key={o.id} offering={o} athleteName={matchedAthlete.name} index={i} />
            ))}
          </div>

          {/* Referral tiers */}
          <h2 className="font-display text-2xl text-white mb-3">🔗 REFERRAL UNLOCKS</h2>
          <div className="space-y-2">
            {REFERRAL_TIERS.map((t, i) => (
              <motion.div
                key={t.count}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.07 }}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/5"
              >
                <span className="font-bold text-sm shrink-0" style={{ color }}>+{t.count}</span>
                <p className="text-xs text-white/50 leading-relaxed">{t.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Retake */}
          <button
            onClick={quiz.reset}
            className="mt-6 text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            🔄 Retake quiz
          </button>
        </div>
      </div>
    </motion.div>
  )
}
