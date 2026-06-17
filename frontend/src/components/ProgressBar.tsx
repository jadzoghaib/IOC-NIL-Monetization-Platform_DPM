import { motion } from 'framer-motion'

export default function ProgressBar({ progress, total = 7, current = 0 }: { progress: number; total?: number; current?: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/10"
          >
            <motion.div
              className="h-full bg-gold rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i < current ? 1 : 0 }}
              style={{ originX: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            />
          </motion.div>
        ))}
      </div>
      <p className="text-text-muted text-xs font-medium">
        Question {current} of {total}
      </p>
    </div>
  )
}
