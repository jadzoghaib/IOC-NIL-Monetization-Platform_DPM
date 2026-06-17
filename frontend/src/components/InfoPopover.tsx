import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Small click-to-open explainer. Used on sponsorship metrics to explain in
 * plain English what a number means and the logic behind it (not exact maths).
 */
export default function InfoPopover({ title, children, align = 'right' }: {
  title: string
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-[11px] text-white/35 hover:text-white/80 cursor-help leading-none transition-colors"
        aria-label={`What is ${title}?`}
      >ⓘ</button>
      <AnimatePresence>
        {open && (
          <>
            {/* click-away */}
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className={`absolute z-[91] mt-2 w-60 rounded-xl p-3 text-left ${align === 'right' ? 'right-0' : 'left-0'}`}
              style={{ background: '#12123A', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-[11px] font-black uppercase tracking-widest text-white/45 mb-1.5">{title}</div>
              <div className="text-xs text-white/65 leading-relaxed">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  )
}
