import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Newspaper, GraduationCap, CalendarDays, Inbox, SearchX, Lock, Sparkles, Video } from 'lucide-react'
import type { useFollows } from '../hooks/useFollows'
import { api } from '../lib/api'
import type { NewsArticle, AthleteRecord } from '../lib/api'
import NewsCard from '../components/NewsCard'
import { ensureSeeded } from '../lib/seed'
import { labelFor } from '../lib/athleteLabel'
import {
  useStoreVersion, listPosts, listCourses, listSlots, isSubscribed,
  type AthletePost, type Course,
} from '../lib/store'

interface Props {
  follows: ReturnType<typeof useFollows>
  onViewProfile: (id: string) => void
  onGoDiscover: () => void
}

interface Meta { id: string; name: string; flag: string; country: string; sport: string; thumbnail?: string; color: string }

type WallItem =
  | { kind: 'post';   ts: number; aid: string; post: AthletePost }
  | { kind: 'course'; ts: number; aid: string; course: Course }
  | { kind: 'news';   ts: number; aid: string; article: NewsArticle }

type TabKey = 'feed' | 'posts' | 'news' | 'courses' | 'appearances'

const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`)
const relTime = (ts: number) => {
  if (!ts) return ''
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
const prettyDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function MyFeedView({ follows, onViewProfile, onGoDiscover }: Props) {
  useStoreVersion()
  const [metas, setMetas] = useState<Record<string, Meta>>({})
  const [news, setNews] = useState<Record<string, NewsArticle[]>>({})
  const [loading, setLoading] = useState(false)
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<TabKey>('feed')

  const followedKey = follows.followed.join(',')

  // Resolve athlete metadata + seed demo content + load news for any new follows.
  useEffect(() => {
    const need = follows.followed.filter(id => !metas[id])
    if (need.length === 0) return
    let cancelled = false
    setLoading(true)
    Promise.allSettled(need.map(async id => {
      const rec: AthleteRecord = await api.getAthlete(id)
      ensureSeeded({
        id: rec.id, name: rec.name, sport: rec.sport, country: rec.country, thumbnail: rec.thumbnail,
        stars: rec.stars, is_medalist: rec.is_medalist, medal_totals: rec.medal_totals,
      })
      const meta: Meta = {
        id: rec.id, name: rec.name, flag: rec.flag || '🏳️', country: rec.country || '', sport: rec.sport || '',
        thumbnail: rec.thumbnail, color: labelFor(rec).color,
      }
      const n = await api.getNews(id).then(r => r.articles ?? []).catch(() => [])
      return { meta, news: n }
    })).then(results => {
      if (cancelled) return
      const m: Record<string, Meta> = {}
      const nw: Record<string, NewsArticle[]> = {}
      for (const r of results) if (r.status === 'fulfilled') { m[r.value.meta.id] = r.value.meta; nw[r.value.meta.id] = r.value.news }
      setMetas(prev => ({ ...prev, ...m }))
      setNews(prev => ({ ...prev, ...nw }))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [followedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const followed = follows.followed.map(id => metas[id]).filter(Boolean) as Meta[]

  // Build the unified wall.
  const items: WallItem[] = []
  for (const id of follows.followed) {
    if (athleteFilter !== 'all' && athleteFilter !== id) continue
    for (const p of listPosts(id)) items.push({ kind: 'post', ts: new Date(p.createdAt).getTime(), aid: id, post: p })
    for (const c of listCourses(id)) items.push({ kind: 'course', ts: new Date(c.createdAt).getTime(), aid: id, course: c })
    for (const a of (news[id] ?? [])) items.push({ kind: 'news', ts: new Date(a.published ?? a.date ?? 0).getTime(), aid: id, article: a })
  }
  const wallKindFilter = activeTab === 'posts' ? 'post' : activeTab === 'news' ? 'news' : activeTab === 'courses' ? 'course' : null
  const wall = items
    .filter(i => wallKindFilter === null || i.kind === wallKindFilter)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 120)

  // Upcoming appearances/appointments across followed athletes.
  const appointments = follows.followed
    .filter(id => athleteFilter === 'all' || athleteFilter === id)
    .flatMap(id => listSlots(id).filter(s => !s.booked).slice(0, 1).map(s => ({ id, slot: s })))
    .slice(0, 6)

  if (follows.followed.length === 0) {
    return (
      <motion.div key="feed-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Inbox size={56} className="mb-6 mx-auto" style={{ color: 'var(--text-faint)', opacity: 0.35 }} />
        <h2 className="font-display text-4xl text-white mb-3">YOUR WALL IS EMPTY</h2>
        <p className="text-white/40 max-w-sm mb-8">Follow athletes from your matches or Discover to get their posts, news, courses, and open dates here.</p>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onGoDiscover}
          className="px-8 py-3 rounded-xl font-display text-xl text-black" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)' }}>
          DISCOVER ATHLETES →
        </motion.button>
      </motion.div>
    )
  }

  const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
    { key: 'feed',        label: 'Feed',        icon: <Inbox size={13} /> },
    { key: 'posts',       label: 'Posts',       icon: <Camera size={13} /> },
    { key: 'news',        label: 'News',        icon: <Newspaper size={13} /> },
    { key: 'courses',     label: 'Courses',     icon: <GraduationCap size={13} /> },
    { key: 'appearances', label: 'Appearances', icon: <CalendarDays size={13} /> },
  ]

  return (
    <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div className="mb-5">
        <h1 className="font-display text-5xl text-white mb-2">MY WALL</h1>
        <p className="text-white/40 text-sm">Following {follows.followed.length} athlete{follows.followed.length !== 1 ? 's' : ''} · posts, news, courses & open dates in one place</p>
      </div>

      {/* Athlete chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setAthleteFilter('all')}
          className="px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
          style={athleteFilter === 'all' ? { borderColor: 'var(--border-2)', background: 'var(--surface)', color: 'var(--text)' } : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          All athletes
        </button>
        {followed.map(a => (
          <button key={a.id} onClick={() => setAthleteFilter(a.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
            style={athleteFilter === a.id ? { borderColor: `${a.color}60`, background: `${a.color}1A`, color: a.color } : { borderColor: `${a.color}30`, background: `${a.color}08`, color: a.color }}>
            <span>{a.flag}</span><span>{a.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border-b mb-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap"
            style={activeTab === t.key
              ? { color: '#FFD700' }
              : { color: 'rgba(255,255,255,0.35)' }}>
            {t.icon}{t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: '#FFD700' }} />
            )}
          </button>
        ))}
      </div>

      {/* Upcoming appointments — shown only in Feed or Appearances tab */}
      {appointments.length > 0 && (activeTab === 'feed' || activeTab === 'appearances') && (
        <div className="rounded-2xl border p-4 mb-6" style={{ borderColor: 'rgba(42,157,143,0.2)', background: 'rgba(42,157,143,0.05)' }}>
          <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-emerald-300/70 mb-2"><CalendarDays size={12} /> Open with your athletes</div>
          <div className="flex flex-wrap gap-2">
            {appointments.map(({ id, slot }) => {
              const m = metas[id]
              return (
                <button key={slot.id} onClick={() => onViewProfile(id)}
                  className="px-3 py-1.5 rounded-xl text-xs text-white/70 transition-colors hover:bg-white/[0.04]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {m?.flag} <b className="text-white/85">{m?.name.split(' ')[0]}</b> · {slot.activity} · {prettyDate(slot.date)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Appearances-only tab panel */}
      {activeTab === 'appearances' && appointments.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <CalendarDays size={40} className="mb-4 mx-auto" style={{ color: 'var(--text-faint)', opacity: 0.35 }} />
          <p>No open dates from your followed athletes yet.</p>
        </div>
      )}

      {loading && wall.length === 0 && activeTab !== 'appearances' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/6 p-4 animate-pulse">
              <div className="h-3 bg-white/8 rounded w-1/4 mb-3" /><div className="h-4 bg-white/8 rounded w-3/4 mb-2" /><div className="h-3 bg-white/6 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* The wall */}
      {wall.length > 0 && activeTab !== 'appearances' && (
        <div className="space-y-4">
          <AnimatePresence>
            {wall.map((item, i) => {
              const m = metas[item.aid]
              if (!m) return null
              return (
                <motion.div key={`${item.kind}-${item.kind === 'news' ? item.article.url : item.kind === 'post' ? item.post.id : item.course.id}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: Math.min(i * 0.02, 0.18), duration: 0.2 }}>
                  {/* Byline */}
                  <button onClick={() => onViewProfile(item.aid)} className="flex items-center gap-2 mb-2 group">
                    <span className="text-lg">{m.flag}</span>
                    <span className="text-xs font-semibold group-hover:opacity-80 transition-opacity" style={{ color: m.color }}>{m.name}</span>
                    {item.ts > 0 && <span className="text-white/25 text-[11px]">· {relTime(item.ts)}</span>}
                  </button>

                  {item.kind === 'news' && <NewsCard article={item.article} index={i} />}

                  {item.kind === 'post' && (
                    isSubscribed(item.aid) ? (
                      <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {item.post.sponsoredBy && <div className="flex items-center gap-1.5 text-xs font-bold text-gold tracking-wider mb-1.5"><Sparkles size={11} /> Sponsored · {item.post.sponsoredBy}</div>}
                        {item.post.caption && <p className="text-white/85 text-sm leading-relaxed mb-2 whitespace-pre-wrap">{item.post.caption}</p>}
                        {item.post.mediaUrl && item.post.kind === 'photo' && (
                          <img src={item.post.mediaUrl} alt="" className="rounded-xl max-h-72 w-full object-cover bg-white/[0.03] mb-2"
                            onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
                        )}
                        {item.post.mediaUrl && item.post.kind === 'video' && (
                          <a href={item.post.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80">▶ Watch video</a>
                        )}
                        <div className="text-white/35 text-xs mt-1">♥ {item.post.likes.toLocaleString()}</div>
                      </div>
                    ) : (
                      <button onClick={() => onViewProfile(item.aid)}
                        className="w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-colors hover:bg-white/[0.03]"
                        style={{ borderColor: `${m.color}30`, background: `${m.color}0A` }}>
                        <Lock size={20} className="flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/80 text-sm font-semibold">{m.name.split(' ')[0]} posted{item.post.kind !== 'text' ? ` a ${item.post.kind}` : ''} — subscribers only</div>
                          <div className="text-white/40 text-xs mt-0.5 truncate" style={{ filter: 'blur(3px)' }} aria-hidden>{item.post.caption || 'Behind-the-scenes content'}</div>
                        </div>
                        <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: `${m.color}1A`, color: m.color }}>Unlock →</span>
                      </button>
                    )
                  )}

                  {item.kind === 'course' && (
                    <button onClick={() => onViewProfile(item.aid)} className="w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-colors hover:bg-white/[0.03]"
                      style={{ background: (item.course.format ?? 'standard') === 'coaching' ? 'rgba(42,157,143,0.06)' : 'rgba(255,215,0,0.05)', borderColor: (item.course.format ?? 'standard') === 'coaching' ? 'rgba(42,157,143,0.25)' : 'rgba(255,215,0,0.2)' }}>
                      <div className="flex-shrink-0">
                        {(item.course.format ?? 'standard') === 'coaching'
                          ? <Video size={22} style={{ color: '#2A9D8F' }} />
                          : <GraduationCap size={22} style={{ color: '#FFD700' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/60 text-[11px] uppercase tracking-wide">{(item.course.format ?? 'standard') === 'coaching' ? 'New 1:1 coaching' : 'New course'}</div>
                        <div className="text-white text-sm font-semibold truncate">{item.course.title}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm" style={{ color: (item.course.format ?? 'standard') === 'coaching' ? '#2A9D8F' : '#FFD700' }}>
                          {money((item.course.format ?? 'standard') === 'coaching' ? (item.course.coachingPrice ?? 99) : item.course.price)}
                        </div>
                        <div className="text-white/30 text-[10px]">View →</div>
                      </div>
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {!loading && wall.length === 0 && activeTab !== 'appearances' && (
        <div className="text-center py-16 text-white/30">
          <SearchX size={40} className="mb-4 mx-auto" style={{ color: 'var(--text-faint)', opacity: 0.35 }} />
          <p>Nothing here yet for this tab.</p>
          <p className="text-xs mt-1">Open an athlete's profile to load their content, or switch tabs.</p>
        </div>
      )}
    </motion.div>
  )
}
