import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { NewsResult } from '../lib/api'

const NEWS_CACHE_KEY = (id: string) => `olympics_news_${id}`
const CLIENT_TTL = 3_600_000 // 1 hour client-side cache

interface CachedEntry {
  data: NewsResult
  cachedAt: number
}

function loadClientCache(id: string): NewsResult | null {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY(id))
    if (!raw) return null
    const entry = JSON.parse(raw) as CachedEntry
    if (Date.now() - entry.cachedAt > CLIENT_TTL) return null
    return entry.data
  } catch {
    return null
  }
}

function saveClientCache(id: string, data: NewsResult) {
  try {
    const entry: CachedEntry = { data, cachedAt: Date.now() }
    localStorage.setItem(NEWS_CACHE_KEY(id), JSON.stringify(entry))
  } catch {}
}

export function useAthleteNews(athleteId: string | null) {
  const [data, setData]       = useState<NewsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchNews = useCallback(async (id: string, force = false) => {
    if (!force) {
      const cached = loadClientCache(id)
      if (cached) { setData(cached); return }
    }
    setLoading(true)
    setError(null)
    try {
      const result = force ? await api.refreshNews(id) : await api.getNews(id)
      setData(result)
      saveClientCache(id, result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (athleteId) fetchNews(athleteId)
  }, [athleteId, fetchNews])

  const refresh = useCallback(() => {
    if (athleteId) fetchNews(athleteId, true)
  }, [athleteId, fetchNews])

  return {
    articles: data?.articles ?? [],
    stale:    data?.stale ?? false,
    source:   data?.source,
    loading,
    error,
    refresh,
  }
}
