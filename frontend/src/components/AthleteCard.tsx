import { motion } from 'framer-motion'
import type { Athlete } from '../data/athletes'
import FollowButton from './FollowButton'

interface Props {
  athlete: Athlete
  isFollowed: boolean
  onToggleFollow: (id: string) => void
  onViewProfile: (id: string) => void
  compact?: boolean
  index?: number
}

export default function AthleteCard({ athlete, isFollowed, onToggleFollow, onViewProfile, compact = false, index = 0 }: Props) {
  const color = athlete.archetypeColor

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: `linear-gradient(135deg, ${color}14 0%, var(--bg-card) 60%)`, border: `1px solid ${color}30` }}
    >
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="text-3xl leading-none">{athlete.flag}</span>
            <h3 className="font-display text-xl mt-1 text-white tracking-wide">{athlete.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: `${color}CC` }}>
              {athlete.country} · {athlete.sport}
            </p>
          </div>
          <div className="shrink-0">
            <FollowButton isFollowed={isFollowed} onToggle={() => onToggleFollow(athlete.id)} size="sm" />
          </div>
        </div>

        {/* Archetype badge */}
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: `${color}20`, color }}
        >
          <span>{athlete.archetypeName}</span>
        </div>

        {/* Story excerpt */}
        {!compact && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-3 mb-4">
            {athlete.story}
          </p>
        )}

        {/* View profile button */}
        <motion.button
          onClick={() => onViewProfile(athlete.id)}
          whileHover={{ x: 4 }}
          className="text-xs font-semibold flex items-center gap-1.5 transition-colors"
          style={{ color }}
        >
          View Profile →
        </motion.button>
      </div>
    </motion.div>
  )
}
