import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: 3,
      background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100,
      flexShrink: 0,
    }}>
      {(['light', 'dark'] as const).map(t => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          style={{
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            border: 'none',
            background: theme === t ? 'var(--bg-card)' : 'none',
            cursor: 'pointer',
            color: theme === t ? 'var(--text)' : 'var(--text-faint)',
            padding: '7px 14px', borderRadius: 100,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: theme === t ? 'var(--shadow)' : 'none',
            transition: 'all .2s ease',
          }}
        >
          {t === 'light' ? <Sun size={13} /> : <Moon size={13} />}
          {t === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  )
}
