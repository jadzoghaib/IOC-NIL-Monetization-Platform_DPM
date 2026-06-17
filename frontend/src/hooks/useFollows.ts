import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'olympics_follows'

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {}
}

export function useFollows() {
  const [followed, setFollowed] = useState<string[]>(loadFromStorage)

  useEffect(() => { saveToStorage(followed) }, [followed])

  const follow = useCallback((id: string) => {
    setFollowed(prev => prev.includes(id) ? prev : [...prev, id])
  }, [])

  const unfollow = useCallback((id: string) => {
    setFollowed(prev => prev.filter(x => x !== id))
  }, [])

  const toggle = useCallback((id: string) => {
    setFollowed(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const isFollowed = useCallback((id: string) => followed.includes(id), [followed])

  return { followed, follow, unfollow, toggle, isFollowed }
}
