import { motion } from 'framer-motion'

interface Props {
  isFollowed: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
}

export default function FollowButton({ isFollowed, onToggle, size = 'md' }: Props) {
  const small = size === 'sm'
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 1.25 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={`relative overflow-hidden rounded-full font-semibold transition-all duration-300 no-select
        ${small ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm'}
        ${isFollowed
          ? 'bg-gold text-black border-2 border-gold shadow-gold-glow'
          : 'bg-transparent text-gold border-2 border-gold hover:bg-gold hover:text-black'
        }`}
    >
      <motion.span
        key={String(isFollowed)}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {isFollowed ? '✓ Following' : '+ Follow'}
      </motion.span>
    </motion.button>
  )
}
