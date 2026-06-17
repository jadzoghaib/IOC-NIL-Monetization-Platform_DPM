import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useStoreVersion,
  listPosts, addPost, deletePost, updatePost,
  listCourses, addCourse, deleteCourse, updateCourse,
  listSlots, addSlot, deleteSlot, toggleSlotBooked, updateSlot,
  listAppearances, addAppearance, updateAppearance, deleteAppearance,
  listOffers, setOfferStatus, addMessage, threadCount,
  getPricing, setPricing,
  DEAL_TYPE_META, POST_KINDS, AVAILABILITY_ACTIVITIES,
  type PostKind, type AvailabilityActivity, type Offer, type Course, type AthletePricing, type Appearance,
} from '../lib/store'
import { ensureSeeded } from '../lib/seed'
import { EditableText, EditableNumber } from '../components/Editable'
import ChatThread from '../components/ChatThread'

const GOLD = '#FFD700'

interface AthleteInfo {
  id: string; name: string; sport: string; flag: string; country: string
  thumbnail?: string; is_medalist?: boolean; stars?: number; pageviews_60d?: number
  medal_totals?: { gold: number; silver: number; bronze: number }
}

interface Props {
  athleteId: string
  onBack: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const money = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`)
const relTime = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
const prettyDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

const cardStyle = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }

// ── CONTENT TAB ───────────────────────────────────────────────────────────────
function ContentTab({ athleteId }: { athleteId: string }) {
  useStoreVersion()
  const posts = listPosts(athleteId)
  const [kind, setKind] = useState<PostKind>('text')
  const [caption, setCaption] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')

  const publish = () => {
    if (!caption.trim() && !mediaUrl.trim()) return
    addPost({ athleteId, kind, caption: caption.trim(), mediaUrl: mediaUrl.trim() || undefined })
    setCaption(''); setMediaUrl('')
  }

  return (
    <div className="space-y-5">
      {/* Composer — styled like a fan card */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,215,0,0.25)', background: 'linear-gradient(145deg, rgba(255,215,0,0.05) 0%, rgba(13,13,43,0.97) 100%)' }}>
        <div className="h-0.5 w-full" style={{ background: GOLD }} />
        <div className="p-4">
          <div className="flex gap-2 mb-3">
            {POST_KINDS.map(k => (
              <button key={k} onClick={() => setKind(k)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={kind === k
                  ? { background: 'rgba(255,215,0,0.18)', color: GOLD, border: '1px solid rgba(255,215,0,0.4)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {k === 'photo' ? '🖼️ Photo' : k === 'video' ? '🎬 Video' : '✍️ Text'}
              </button>
            ))}
          </div>
          <textarea
            value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Share a training moment, a result, a thank-you to fans…"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-gold/40 transition-colors resize-none mb-3"
          />
          {kind !== 'text' && (
            <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
              placeholder={kind === 'photo' ? 'Image URL (https://…)' : 'Video URL'}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-gold/40 mb-3" />
          )}
          <div className="flex justify-end">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={publish}
              disabled={!caption.trim() && !mediaUrl.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#FFD700 0%,#FF8C00 100%)', color: '#000' }}>
              Publish →
            </motion.button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-white/30 px-1">💡 Tip: click any caption or like-count below to edit it in place.</p>

      {posts.length === 0 ? (
        <div className="text-center text-white/25 text-sm py-10">No posts yet — publish your first above. ☝️</div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden border" style={cardStyle}>
              {p.sponsoredBy && (
                <div className="px-4 pt-3"><span className="text-xs font-bold text-gold tracking-wider">✨ Sponsored · {p.sponsoredBy}</span></div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">{relTime(p.createdAt)} · {p.kind}</span>
                  <button onClick={() => deletePost(p.id)} className="text-white/20 hover:text-red-400 text-xs transition-colors">Delete</button>
                </div>
                <div className="text-white/85 text-sm leading-relaxed mb-2">
                  <EditableText value={p.caption} onSave={v => updatePost(p.id, { caption: v })} multiline placeholder="Click to add a caption…" />
                </div>
                {p.mediaUrl && p.kind === 'photo' && (
                  <img src={p.mediaUrl} alt="" className="rounded-xl max-h-72 w-full object-cover bg-white/[0.03] mb-2"
                    onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
                )}
                {p.mediaUrl && p.kind === 'video' && (
                  <a href={p.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80 mb-2">▶ Watch video</a>
                )}
                <div className="text-white/40 text-xs flex items-center gap-1">
                  ♥ <EditableNumber value={p.likes} onSave={v => updatePost(p.id, { likes: v })} format={n => n.toLocaleString()} /> likes
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── COURSES TAB ───────────────────────────────────────────────────────────────
const LEVELS: Course['level'][] = ['Beginner', 'Intermediate', 'Advanced']

function CoursesTab({ athleteId, defaultPrice }: { athleteId: string; defaultPrice: number }) {
  useStoreVersion()
  const courses = listCourses(athleteId)

  const newCourse = () =>
    addCourse({ athleteId, title: 'New course', description: '', price: defaultPrice, level: 'Beginner', lessons: [] })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/30">💡 Click any field on a course to edit it.</p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={newCourse}
          className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,215,0,0.12)', color: GOLD, border: '1px solid rgba(255,215,0,0.3)' }}>
          ＋ New course
        </motion.button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center text-white/25 text-sm py-10">No courses yet — create one above. 🎓</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course: c }: { course: Course }) {
  const fmt = c.format ?? 'standard'
  const [chatOpen, setChatOpen] = useState(false)
  const drillCount = threadCount(`drills:${c.id}`)

  const cycleLevel = () => {
    const i = LEVELS.indexOf(c.level)
    updateCourse(c.id, { level: LEVELS[(i + 1) % LEVELS.length] })
  }
  const toggleFormat = () => updateCourse(c.id, { format: fmt === 'standard' ? 'coaching' : 'standard' })
  const setLesson = (i: number, patch: { title?: string; duration?: string }) =>
    updateCourse(c.id, { lessons: c.lessons.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })
  const addLesson = () => updateCourse(c.id, { lessons: [...c.lessons, { title: 'New lesson', duration: '10 min' }] })
  const removeLesson = (i: number) => updateCourse(c.id, { lessons: c.lessons.filter((_, idx) => idx !== i) })

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border flex flex-col" style={cardStyle}>
      <div className="h-0.5 w-full" style={{ background: fmt === 'coaching' ? '#2A9D8F' : GOLD, opacity: 0.7 }} />
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <button onClick={toggleFormat} title="Click to switch format"
              className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={fmt === 'coaching'
                ? { background: 'rgba(42,157,143,0.18)', color: '#2A9D8F' }
                : { background: 'rgba(255,215,0,0.15)', color: GOLD }}>
              {fmt === 'coaching' ? '🎥 1:1 Coaching' : '▶ Standard'}
            </button>
            <button onClick={cycleLevel} className="text-[10px] font-bold uppercase tracking-widest text-white/40" title="Click to change level">
              {c.level}
            </button>
          </div>
          <h4 className="font-semibold text-white text-sm">
            <EditableText value={c.title} onSave={v => updateCourse(c.id, { title: v })} placeholder="Course title" />
          </h4>
        </div>
        <div className="text-right flex-shrink-0">
          {fmt === 'coaching' ? (
            <div className="text-[#2A9D8F] font-bold text-base">
              <EditableNumber value={c.coachingPrice ?? 99} onSave={v => updateCourse(c.id, { coachingPrice: v })} prefix="$" />
            </div>
          ) : (
            <div className="text-gold font-bold text-base">
              <EditableNumber value={c.price} onSave={v => updateCourse(c.id, { price: v })} prefix="$" />
            </div>
          )}
          <button onClick={() => deleteCourse(c.id)} className="text-white/20 hover:text-red-400 text-[11px]">Delete</button>
        </div>
      </div>
      <div className="px-4 py-3 flex-1">
        <p className="text-xs text-white/50 leading-relaxed mb-3">
          <EditableText value={c.description} onSave={v => updateCourse(c.id, { description: v })} multiline placeholder="What will fans learn?" />
        </p>

        {fmt === 'coaching' ? (
          <div className="text-xs text-white/45 rounded-lg p-2.5" style={{ background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)' }}>
            🎥 Fans pay for a personalised plan, send you their training clips, and you reply in <b className="text-white/70">Drills &amp; Feedback</b> below.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {c.lessons.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-xs gap-2 group">
                  <span className="text-white/55 flex-1 truncate">
                    🔒 {i + 1}. <EditableText value={l.title} onSave={v => setLesson(i, { title: v })} />
                  </span>
                  <span className="text-white/30"><EditableText value={l.duration} onSave={v => setLesson(i, { duration: v })} /></span>
                  <button onClick={() => removeLesson(i)} className="text-white/15 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addLesson} className="text-gold/60 hover:text-gold text-xs mt-2">+ Add lesson</button>
            <div className="text-[11px] text-white/30 mt-2">🔒 Locked for fans until they unlock for ${c.price}.</div>
          </>
        )}

        <button onClick={() => setChatOpen(o => !o)}
          className="mt-3 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors">
          💬 Drills &amp; Feedback{drillCount > 0 ? ` (${drillCount})` : ''} {chatOpen ? '▾' : '▸'}
        </button>
        {chatOpen && (
          <div className="mt-2">
            <ChatThread
              threadId={`drills:${c.id}`}
              me="athlete"
              otherName="Fan"
              accent="#2A9D8F"
              placeholder="Reply with coaching feedback…"
              emptyHint="When fans post their drill clips, reply here with feedback."
              quickReplies={['Nice work — small tweak:', 'Send me a side-angle clip', "Let's build a plan around this"]}
              maxHeight={220}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── APPEARANCES + AVAILABILITY TAB ────────────────────────────────────────────
function AppearanceRow({ ap }: { ap: Appearance }) {
  const toggleMode = () =>
    updateAppearance(ap.id, { priceMode: ap.priceMode === 'on_request' ? 'from' : 'on_request', price: ap.price ?? 500 })
  return (
    <div className="rounded-2xl p-4 border" style={cardStyle}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="font-semibold text-white text-sm flex-1 min-w-0">
          <EditableText value={ap.type} onSave={v => updateAppearance(ap.id, { type: v })} placeholder="Appearance type" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={toggleMode}
            className="px-2 py-0.5 rounded-full text-[11px] font-bold transition-all"
            style={ap.priceMode === 'on_request'
              ? { background: 'rgba(42,157,143,0.15)', color: '#2A9D8F', border: '1px solid rgba(42,157,143,0.3)' }
              : { background: 'rgba(255,215,0,0.14)', color: GOLD, border: '1px solid rgba(255,215,0,0.3)' }}>
            {ap.priceMode === 'on_request' ? '💬 Open to discuss' : '💲 From'}
          </button>
          {ap.priceMode === 'from' && (
            <span className="text-gold font-bold text-sm">
              <EditableNumber value={ap.price ?? 500} onSave={v => updateAppearance(ap.id, { price: v })} format={money} />
            </span>
          )}
          <button onClick={() => updateAppearance(ap.id, { active: !ap.active })}
            className="text-[11px] font-bold transition-colors" style={{ color: ap.active ? '#34D399' : 'rgba(255,255,255,0.3)' }}
            title="Toggle visibility to fans">
            {ap.active ? 'Live' : 'Hidden'}
          </button>
          <button onClick={() => deleteAppearance(ap.id)} className="text-white/20 hover:text-red-400 text-xs">✕</button>
        </div>
      </div>
      <p className="text-xs text-white/50 leading-relaxed">
        <EditableText value={ap.details} onSave={v => updateAppearance(ap.id, { details: v })} multiline placeholder="Add details — what's included, where, any conditions…" />
      </p>
    </div>
  )
}

function AvailabilityTab({ athleteId }: { athleteId: string }) {
  useStoreVersion()
  const slots = listSlots(athleteId)
  const appearances = listAppearances(athleteId)
  const pricing = getPricing(athleteId)
  const today = new Date().toISOString().slice(0, 10)

  const addOpenSlot = () => addSlot({ athleteId, date: today, activity: AVAILABILITY_ACTIVITIES[0] })
  const newAppearance = () =>
    addAppearance({ athleteId, type: 'New appearance', priceMode: 'on_request', details: 'Open to discuss — get in touch.', active: true })

  return (
    <div className="space-y-6">
      {/* Inner Circle subscription */}
      <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(255,215,0,0.2)', background: 'rgba(255,215,0,0.03)' }}>
        <h3 className="font-display text-xl text-white mb-1">⭐ INNER CIRCLE</h3>
        <p className="text-xs text-white/35 mb-3">Your monthly fan membership — click the price to change it.</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Monthly subscription</span>
          <span className="text-gold font-bold">
            <EditableNumber value={pricing.subscription} onSave={v => setPricing(athleteId, { subscription: v })} format={money} prefix="" />
            <span className="text-white/30 font-normal text-xs ml-1">/ mo</span>
          </span>
        </div>
      </div>

      {/* Appearances & bookings */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl text-white">🤝 APPEARANCES & BOOKINGS</h3>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={newAppearance}
            className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,215,0,0.12)', color: GOLD, border: '1px solid rgba(255,215,0,0.3)' }}>
            ＋ Add type
          </motion.button>
        </div>
        <p className="text-xs text-white/35 mb-3">
          Set what you offer and how you price it. Default to <b className="text-white/60">“Open to discuss”</b> — perfect for grassroots clubs, clinics, and school visits.
        </p>
        {appearances.length === 0 ? (
          <div className="text-center text-white/25 text-sm py-6">No appearance types yet — add one above.</div>
        ) : (
          <div className="space-y-3">{appearances.map(ap => <AppearanceRow key={ap.id} ap={ap} />)}</div>
        )}
      </div>

      {/* Availability */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl text-white">📅 OPEN AVAILABILITY</h3>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={addOpenSlot}
            className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,215,0,0.12)', color: GOLD, border: '1px solid rgba(255,215,0,0.3)' }}>
            ＋ Add slot
          </motion.button>
        </div>

        {slots.length === 0 ? (
          <div className="text-center text-white/25 text-sm py-8">No availability — add an open slot. 📅</div>
        ) : (
          <div className="rounded-2xl overflow-hidden border" style={cardStyle}>
            {slots.map(s => (
              <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0">
                <input type="date" min={today} value={s.date} onChange={e => updateSlot(s.id, { date: e.target.value })}
                  className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 outline-none focus:border-gold/40 w-36" />
                <select value={s.activity} onChange={e => updateSlot(s.id, { activity: e.target.value as AvailabilityActivity })}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-sm text-white/75 outline-none focus:border-gold/40">
                  {AVAILABILITY_ACTIVITIES.map(a => <option key={a}>{a}</option>)}
                </select>
                <button onClick={() => toggleSlotBooked(s.id)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={s.booked
                    ? { background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }
                    : { background: 'rgba(255,215,0,0.14)', color: GOLD, border: '1px solid rgba(255,215,0,0.3)' }}>
                  {s.booked ? 'Booked' : 'Open'}
                </button>
                <button onClick={() => deleteSlot(s.id)} className="text-white/20 hover:text-red-400 text-xs flex-shrink-0">✕</button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── OFFERS INBOX TAB ──────────────────────────────────────────────────────────
function OffersTab({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  useStoreVersion()
  const offers = listOffers({ athleteId })

  const accept = (o: Offer) => {
    setOfferStatus(o.id, 'accepted')
    addMessage(o.id, 'system', '✅ Offer accepted — a sponsored post was drafted in Content.')
    addPost({
      athleteId, kind: 'text',
      caption: `Excited to team up with ${o.brand}! 🎉 More coming soon. #${o.brand.replace(/\s+/g, '')}Partner`,
      sponsoredBy: o.brand,
    })
  }
  const decline = (o: Offer) => {
    setOfferStatus(o.id, 'declined')
    addMessage(o.id, 'system', 'Offer declined.')
  }

  if (offers.length === 0) {
    return (
      <div className="text-center text-white/30 text-sm py-12">
        <div className="text-3xl mb-3">📭</div>
        No offers yet for {athleteName}.<br />
        <span className="text-white/20">Switch to Sponsorship Mode and send one — it'll appear here live.</span>
      </div>
    )
  }

  const STATUS_STYLE: Record<Offer['status'], { bg: string; color: string; label: string }> = {
    pending:  { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: 'Pending' },
    accepted: { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', label: 'Accepted' },
    declined: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', label: 'Declined' },
  }

  return (
    <div className="space-y-4">
      {offers.map(o => {
        const meta = DEAL_TYPE_META[o.dealType]
        const ss = STATUS_STYLE[o.status]
        return (
          <motion.div key={o.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 border" style={cardStyle}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold">{o.brand}</span>
                  <span className="text-white/30 text-xs">{relTime(o.createdAt)}</span>
                </div>
                <div className="text-white/50 text-sm mt-0.5">{meta.icon} {meta.label}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-gold font-bold text-lg">{money(o.amount)}</div>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
              </div>
            </div>
            <ChatThread
              threadId={o.id}
              me="athlete"
              otherName={o.brand}
              accent="#FFD700"
              placeholder="Reply to the brand…"
              quickReplies={["Interested — tell me more", "Could we do a bit more?", "What's the timeline?"]}
              maxHeight={240}
              actions={o.status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => accept(o)} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                    ✓ Accept deal
                  </button>
                  <button onClick={() => decline(o)} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Decline
                  </button>
                </div>
              ) : undefined}
            />
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = 'content' | 'courses' | 'availability' | 'offers'

export default function AthleteManageView({ athleteId, onBack }: Props) {
  useStoreVersion()
  const [athlete, setAthlete] = useState<AthleteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('content')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/athletes/${athleteId}`)
      .then(r => r.json())
      .then((d: AthleteInfo) => {
        setAthlete(d)
        ensureSeeded(d)   // populate realistic demo data the first time
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [athleteId])

  const pendingOffers = listOffers({ athleteId }).filter(o => o.status === 'pending').length
  const postCount = listPosts(athleteId).length
  const courseCount = listCourses(athleteId).length
  const defaultPrice = getPricing(athleteId).courseDefault

  if (loading) return <div className="text-white/30 text-sm text-center py-20 animate-pulse">Loading athlete…</div>
  if (!athlete) return (
    <div className="text-white/40 text-center py-20">
      Failed to load athlete.
      <button onClick={onBack} className="block mx-auto mt-4 text-gold text-sm">← Back to roster</button>
    </div>
  )

  const medals = athlete.medal_totals
  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'content',      label: 'Content',      icon: '📸', badge: postCount },
    { id: 'courses',      label: 'Courses',      icon: '🎓', badge: courseCount },
    { id: 'availability', label: 'Rates & Dates', icon: '📅' },
    { id: 'offers',       label: 'Offers',       icon: '✉️', badge: pendingOffers },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm transition-colors mb-5">
        ← Back to roster
      </button>

      {/* Identity header — fan-mode hero style */}
      <div className="relative rounded-3xl p-6 mb-6 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${GOLD}18 0%, rgba(13,13,43,0.98) 100%)`, border: `1px solid ${GOLD}33` }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: GOLD }} />
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/[0.05] flex-shrink-0 flex items-center justify-center text-3xl" style={{ border: `2px solid ${GOLD}40` }}>
            {athlete.thumbnail ? <img src={athlete.thumbnail} alt={athlete.name} className="w-full h-full object-cover" /> : athlete.flag}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/40 text-sm">{athlete.flag} {athlete.country} · {athlete.sport}</div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: GOLD }}>{athlete.name.toUpperCase()}</h1>
            {medals && (medals.gold + medals.silver + medals.bronze) > 0 && (
              <div className="flex gap-2 mt-1 text-sm">
                {medals.gold > 0 && <span>🥇{medals.gold > 1 ? `×${medals.gold}` : ''}</span>}
                {medals.silver > 0 && <span>🥈{medals.silver > 1 ? `×${medals.silver}` : ''}</span>}
                {medals.bronze > 0 && <span>🥉{medals.bronze > 1 ? `×${medals.bronze}` : ''}</span>}
              </div>
            )}
          </div>
          <div className="hidden sm:block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex-shrink-0"
            style={{ background: 'rgba(42,157,143,0.18)', color: '#2A9D8F', border: '1px solid rgba(42,157,143,0.4)' }}>
            🏃 You
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            style={tab === t.id ? { background: 'rgba(255,215,0,0.18)', color: GOLD } : { color: 'rgba(255,255,255,0.35)' }}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {!!t.badge && t.badge > 0 && (
              <span className="px-1.5 rounded-full text-[10px]"
                style={{ background: tab === t.id ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.1)', color: tab === t.id ? GOLD : 'rgba(255,255,255,0.5)' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === 'content'      && <ContentTab athleteId={athleteId} />}
          {tab === 'courses'      && <CoursesTab athleteId={athleteId} defaultPrice={defaultPrice} />}
          {tab === 'availability' && <AvailabilityTab athleteId={athleteId} />}
          {tab === 'offers'       && <OffersTab athleteId={athleteId} athleteName={athlete.name} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
