import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

/**
 * Shared theme store.
 *
 * Previously each useTheme() call held its OWN useState, so two toggles (Home
 * header + TopNav) and any theme-reading component would desync — flipping one
 * left the others stale, and components that read `theme` to render dark/light
 * surfaces wouldn't update. This is now a single module-level store, so every
 * toggle and reader stays in lockstep and the <html data-theme> attribute is the
 * one source of truth.
 */
const STORAGE_KEY = 'mmo_theme'

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  return saved === 'light' || saved === 'dark' ? saved : 'dark'
}

let current: Theme = readInitial()
const listeners = new Set<() => void>()

function apply(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// Apply once at module load so the attribute is correct before first paint.
apply(current)

function setTheme(theme: Theme) {
  if (theme === current) return
  current = theme
  try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
  apply(theme)
  listeners.forEach(l => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

function getSnapshot() {
  return current
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'dark' as Theme)
  return [theme, setTheme] as const
}
