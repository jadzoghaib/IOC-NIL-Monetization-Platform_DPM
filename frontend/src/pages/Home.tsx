import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Zap, Handshake, ArrowRight, Medal } from 'lucide-react'
import OlympicRings from '../components/OlympicRings'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'

const MODES = [
  {
    id: 'fan',
    Icon: Heart,
    title: 'Fan Engagement',
    subtitle: 'Find your athlete match',
    description: 'Take the quiz, follow the athletes you love, and unlock their personal stories and exclusive experiences.',
    mc: '#0081C8',
    mcAlpha: 'rgba(0,129,200,0.14)',
    go: 'Take the quiz',
    route: '/fan',
  },
  {
    id: 'athlete',
    Icon: Zap,
    title: 'Athlete Mode',
    subtitle: 'Build your fan economy',
    description: 'Post content, design offerings, set your availability, and field sponsorship offers from brands.',
    mc: '#EE334E',
    mcAlpha: 'rgba(238,51,78,0.14)',
    go: 'Open dashboard',
    route: '/athlete',
  },
  {
    id: 'business',
    Icon: Handshake,
    title: 'Sponsorship Mode',
    subtitle: 'Sponsor the next champion',
    description: 'Build a campaign brief, get brand-fit-ranked athletes, and send partnership offers in a click.',
    mc: '#A78BFA',
    mcAlpha: 'rgba(167,139,250,0.14)',
    go: 'Discover athletes',
    route: '/business',
  },
]

const STATS = [
  { value: '206',    label: 'Nations at the Games' },
  { value: '3.9B',   label: 'Global viewers' },
  { value: '11,714', label: 'Athlete profiles' },
  { value: '8',      label: 'Athlete archetypes' },
]

const RING_STRIP = ['#0081C8', '#FCB131', '#101010', '#009F3D', '#EE334E']

const NAV_ITEMS = [
  { label: 'Home',    route: '/' },
  { label: 'Fan',     route: '/fan' },
  { label: 'Athlete', route: '/athlete' },
  { label: 'Sponsor', route: '/business' },
]

function ModeCard({
  mode, index, navigate,
}: {
  mode: typeof MODES[number]
  index: number
  navigate: (r: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const { Icon } = mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigate(mode.route)}
      style={{
        position: 'relative',
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-2)' : 'var(--border)'}`,
        borderRadius: 18,
        padding: 26,
        cursor: 'pointer',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'none',
        transition: 'transform .22s cubic-bezier(.2,.7,.2,1), box-shadow .22s, border-color .22s',
      }}
    >
      {/* Left accent bar — scales in on hover */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: mode.mc,
        transform: hovered ? 'scaleY(1)' : 'scaleY(0)',
        transformOrigin: 'top',
        transition: 'transform .25s ease',
        borderRadius: '0 3px 3px 0',
      }} />

      {/* Icon tile */}
      <div style={{
        width: 54, height: 54, borderRadius: 15, marginBottom: 20,
        display: 'grid', placeItems: 'center',
        background: mode.mcAlpha,
        color: mode.mc,
      }}>
        <Icon size={26} />
      </div>

      <h3 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.015em', marginBottom: 5, color: 'var(--text)' }}>
        {mode.title}
      </h3>
      <div style={{ fontSize: 14, fontWeight: 700, color: mode.mc, marginBottom: 12 }}>
        {mode.subtitle}
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, fontWeight: 500 }}>
        {mode.description}
      </p>
      <div style={{
        marginTop: 20, display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 14, fontWeight: 700, color: 'var(--text)',
      }}>
        {mode.go}
        <ArrowRight size={16} style={{
          transform: hovered ? 'translateX(4px)' : 'translateX(0)',
          transition: 'transform .2s',
        }} />
      </div>
    </motion.div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  useTheme()

  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        fontFamily: '"Archivo", system-ui, -apple-system, sans-serif',
        transition: 'background .4s ease, color .4s ease',
        overflowX: 'hidden',
      }}
    >
      {/* ─── TOPBAR ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--glass)',
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
        borderBottom: '1px solid var(--border)',
        transition: 'background .4s ease',
      }}>
        <div style={{
          height: 68, display: 'flex', alignItems: 'center', gap: 28,
          maxWidth: 1200, margin: '0 auto', padding: '0 32px',
        }}>
          {/* Brand lockup */}
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0 }}
          >
            <OlympicRings size="xs" animate={false} />
            <span style={{ fontWeight: 900, letterSpacing: '-0.03em', fontSize: 19, color: 'var(--text)' }}>
              MY MATCH
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}> · Olympics</span>
            </span>
          </button>

          {/* Centred nav — hidden on narrow viewports */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 4, marginLeft: 6 }}>
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.route ||
                (item.route !== '/' && location.pathname.startsWith(item.route))
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  style={{
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
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

          {/* Theme toggle */}
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <motion.section
        initial={{ opacity: 0.35, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ padding: '64px 0 0', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>

          {/* 2-col hero grid */}
          <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] items-center gap-12">

            {/* LEFT — copy */}
            <motion.div
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {/* Eyebrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <OlympicRings size="xs" animate={false} mono />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                  Paris 2024 · Road to LA 2028
                </span>
              </div>

              {/* H1 */}
              <h1 style={{
                fontSize: 'clamp(48px, 7.2vw, 96px)',
                fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 0.96,
                marginBottom: 20,
                color: 'var(--text)',
              }}>
                Find your<br />
                <span style={{
                  background: 'linear-gradient(96deg, #0081C8, #009F3D 55%, #FCB131)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Olympic match.
                </span>
              </h1>

              {/* Sub */}
              <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: '32ch', marginBottom: 32, fontWeight: 500, lineHeight: 1.5 }}>
                Discover the athletes who move you. Get their stories. Unlock the experiences only fans like you can.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 44, flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ boxShadow: '0 12px 30px -8px rgba(0,129,200,0.55)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/fan')}
                  style={{
                    fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
                    background: 'var(--accent)', color: 'var(--accent-ink)',
                    padding: '12px 22px', borderRadius: 100,
                    border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                    transition: 'box-shadow .2s ease',
                  }}
                >
                  Find your match <ArrowRight size={17} />
                </motion.button>
                <button
                  onClick={() => navigate('/business')}
                  style={{
                    fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
                    background: 'var(--surface-2)', color: 'var(--text)',
                    padding: '12px 20px', borderRadius: 100,
                    border: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'border-color .18s',
                  }}
                >
                  For brands
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
                {STATS.map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)' }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* RIGHT — visual card (hidden on mobile) */}
            <motion.div
              className="hidden md:block"
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1], delay: 0.1 }}
              style={{
                position: 'relative',
                aspectRatio: '4/5',
                borderRadius: 26,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Tinted gradient placeholder */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `
                  radial-gradient(120% 90% at 80% 10%, rgba(0,129,200,0.3), transparent 60%),
                  radial-gradient(100% 80% at 10% 100%, rgba(238,51,78,0.26), transparent 55%),
                  var(--surface-2)
                `,
                display: 'flex', alignItems: 'flex-end', padding: 28,
              }}>
                {/* Medal icon centre */}
                <Medal
                  size={120}
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--text-faint)', opacity: 0.45,
                  }}
                />

                {/* Live now tag */}
                <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#EE334E', color: '#fff',
                    padding: '5px 12px', borderRadius: 100,
                    fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block', flexShrink: 0 }} />
                    Live now
                  </span>
                </div>

                {/* Glass caption chip */}
                <div style={{
                  position: 'relative', zIndex: 2, width: '100%',
                  background: 'var(--glass)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--border)',
                  borderRadius: 14, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 13,
                  boxShadow: 'var(--shadow)',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: 'var(--ink)', color: 'var(--ink-text)',
                    display: 'grid', placeItems: 'center',
                    fontWeight: 900, fontSize: 17,
                  }}>
                    NL
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text)' }}>Noah Lyles</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>🇺🇸 USA · 100m Sprint</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 5-colour ring accent strip */}
          <div style={{ display: 'flex', height: 8, width: '100%', marginTop: 40, borderRadius: 4, overflow: 'hidden' }}>
            {RING_STRIP.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
          </div>
        </div>
      </motion.section>

      {/* ─── THREE WAYS TO CONNECT ─── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ margin: '72px 0 26px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>
            The platform
          </p>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.04, color: 'var(--text)', marginBottom: 8 }}>
            Three ways to connect
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>
            Athletes, fans, and brands — joined through the Games.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ paddingBottom: 80 }}>
          {MODES.map((mode, i) => (
            <ModeCard key={mode.id} mode={mode} index={i} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid var(--border)', color: 'var(--text-faint)', fontSize: 13 }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '28px 32px',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <OlympicRings size="xs" animate={false} mono />
          <span>My Match · Olympics — concept redesign</span>
          <span style={{ marginLeft: 'auto' }}>Not affiliated with or endorsed by the IOC.</span>
        </div>
      </footer>
    </div>
  )
}
