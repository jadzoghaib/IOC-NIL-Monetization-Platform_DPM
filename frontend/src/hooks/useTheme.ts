import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem('mmo_theme') as Theme) ?? 'dark'
  )

  useEffect(() => {
    localStorage.setItem('mmo_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  return [theme, setThemeState] as const
}
