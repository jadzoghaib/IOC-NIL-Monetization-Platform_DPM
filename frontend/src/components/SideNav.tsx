import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export interface SideNavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
  muted?: boolean
}

interface Props {
  accent: string
  modeIcon: React.ReactNode
  modeLabel: string
  items: SideNavItem[]
  active: string
  onSelect: (id: string) => void
  footer?: React.ReactNode
  open: boolean
  onClose: () => void
}

export default function SideNav({ accent, modeIcon, modeLabel, items, active, onSelect, footer, open, onClose }: Props) {
  const navigate = useNavigate()

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <button
        onClick={() => { navigate('/'); onClose() }}
        className="px-5 pt-5 pb-4 text-left group block"
      >
        <div className="font-display text-base text-gold tracking-widest leading-snug group-hover:opacity-70 transition-opacity">
          PODIUM
        </div>
        <div className="font-display text-[9px] text-gold/40 tracking-[0.25em] uppercase">
          Olympics
        </div>
      </button>

      {/* Mode chip */}
      <div className="px-3 mb-4">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}
        >
          <span className="flex-shrink-0" style={{ color: accent }}>{modeIcon}</span>
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: accent }}>
            {modeLabel}
          </span>
        </div>
      </div>

      <div className="h-px mx-3 mb-3" style={{ background: 'var(--border)' }} />

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {items.map(item => {
          if (item.muted) {
            return (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 text-xs"
                style={{ color: 'var(--text-faint)' }}>
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
            )
          }
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); onClose() }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 relative group"
              style={isActive
                ? { background: `${accent}18`, color: accent }
                : { color: 'var(--text-muted)' }
              }
            >
              {isActive && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                  style={{ background: accent }}
                />
              )}
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="text-sm font-semibold flex-1 min-w-0 truncate" style={isActive ? { color: accent } : {}}>
                {item.label}
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none"
                  style={{
                    background: isActive ? `${accent}28` : 'var(--surface-2)',
                    color: isActive ? accent : 'var(--text-muted)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer slot */}
      {footer && (
        <>
          <div className="h-px mx-3 my-3" style={{ background: 'var(--border)' }} />
          <div className="px-3 pb-5">{footer}</div>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:block w-52 flex-shrink-0 border-r min-h-full"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Content />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-black/65 z-40"
            />
            <motion.aside
              initial={{ x: -210 }}
              animate={{ x: 0 }}
              exit={{ x: -210 }}
              transition={{ type: 'spring', damping: 28, stiffness: 290 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-52 z-50 border-r overflow-y-auto"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-2xl leading-none transition-colors"
                style={{ color: 'var(--text-faint)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
              >
                ×
              </button>
              <Content />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
