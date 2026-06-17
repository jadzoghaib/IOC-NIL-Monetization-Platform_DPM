import { useNavigate, useLocation } from 'react-router-dom'
import OlympicRings from './OlympicRings'
import ThemeToggle from './ThemeToggle'

const NAV_ITEMS = [
  { label: 'Home',    route: '/' },
  { label: 'Fan',     route: '/fan' },
  { label: 'Athlete', route: '/athlete' },
  { label: 'Sponsor', route: '/business' },
]

interface Props {
  onMenuOpen?: () => void
  extra?: React.ReactNode
}

export default function TopNav({ onMenuOpen, extra }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--glass)',
      backdropFilter: 'blur(18px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
      borderBottom: '1px solid var(--border)',
      transition: 'background .4s ease, border-color .4s ease',
    }}>
      <div style={{
        height: 68, display: 'flex', alignItems: 'center', gap: 16,
        maxWidth: 1280, margin: '0 auto', padding: '0 24px',
      }}>

        {/* Mobile hamburger (only when sidebar exists) */}
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            className="md:hidden flex flex-col gap-[5px] w-8 h-8 items-center justify-center flex-shrink-0"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Open menu"
          >
            <span className="block w-5 h-0.5 bg-current rounded-full" />
            <span className="block w-4 h-0.5 bg-current rounded-full" />
            <span className="block w-3 h-0.5 bg-current rounded-full" />
          </button>
        )}

        {/* Brand lockup */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, flexShrink: 0,
          }}
        >
          <OlympicRings size="xs" animate={false} />
          <span style={{
            fontWeight: 900, letterSpacing: '-0.03em', fontSize: 18,
            color: 'var(--text)',
            fontFamily: '"Archivo", system-ui, -apple-system, sans-serif',
          }}>
            MY MATCH
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}> · Olympics</span>
          </span>
        </button>

        {/* Centred nav links — hidden on narrow viewports */}
        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 4, marginLeft: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.route ||
              (item.route !== '/' && location.pathname.startsWith(item.route))
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                style={{
                  fontFamily: '"Archivo", system-ui, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  background: active ? 'var(--surface-2)' : 'none',
                  border: 'none', cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'all .18s ease',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent)',
                  opacity: active ? 1 : 0,
                  transition: 'opacity .18s',
                  flexShrink: 0,
                }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right side: extra slot + toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {extra}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
