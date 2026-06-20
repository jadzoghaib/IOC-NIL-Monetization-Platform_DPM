import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, X, Send, Sparkles, Zap, Handshake,
  ChevronRight, Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { llmChat, type LLMMessage, type ToolDef } from '../lib/openrouter'
import { api } from '../lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

type Mode = 'fan' | 'athlete' | 'business'

interface AthleteCard {
  id: string; name: string; sport: string; country: string; flag: string
}

type UIMsg =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; content: string }
  | { id: string; role: 'athlete_card'; athlete: AthleteCard }
  | { id: string; role: 'typing' }

interface ModeCfg {
  color: string; border: string; bg: string
  name: string; role: string; Icon: LucideIcon
}

export interface AIAssistantProps {
  mode: Mode
  // Fan context
  currentAthleteId?: string
  currentAthleteName?: string
  currentAthleteSport?: string
  currentAthleteCountry?: string
  followedAthletes?: AthleteCard[]
  // Athlete studio context
  managingAthleteId?: string
  managingAthleteName?: string
  managingAthleteSport?: string
  // Business context
  brandName?: string
  brandCategory?: string
  // Callbacks
  onViewProfile?: (id: string) => void
  onOpenBooking?: (athleteId: string) => void
  onNavigateTo?: (section: string) => void
}

// ── Mode config ───────────────────────────────────────────────────────────────

const MODES: Record<Mode, ModeCfg> = {
  fan:      { color: '#FFD700', border: 'rgba(255,215,0,0.3)',    bg: 'rgba(255,215,0,0.08)',    name: 'Maya',      role: 'Fan Assistant',    Icon: Sparkles  },
  athlete:  { color: '#2A9D8F', border: 'rgba(42,157,143,0.3)',   bg: 'rgba(42,157,143,0.08)',   name: 'Studio AI', role: 'Athlete Studio',   Icon: Zap       },
  business: { color: '#A78BFA', border: 'rgba(167,139,250,0.3)',  bg: 'rgba(167,139,250,0.08)',  name: 'Scout AI',  role: 'Sponsorship AI',   Icon: Handshake },
}

// ── System prompts ────────────────────────────────────────────────────────────

function buildSystem(p: AIAssistantProps): string {
  if (p.mode === 'fan') {
    const viewing = p.currentAthleteName
      ? `CURRENTLY VIEWING: ${p.currentAthleteName} — ${p.currentAthleteSport ?? ''}, ${p.currentAthleteCountry ?? ''} (athlete_id: "${p.currentAthleteId}")`
      : 'Not viewing any athlete.'
    const follows = p.followedAthletes?.length
      ? `FOLLOWED: ${p.followedAthletes.slice(0, 6).map(a => a.name).join(', ')}`
      : ''
    return `You are Maya, the My Match Olympics fan assistant. Help fans discover athletes and book experiences.

${viewing}
${follows}
GAMES: Paris 2024 Summer Olympics

TOOL RULES:
• "this athlete" / "them" / "book them" → use athlete_id="${p.currentAthleteId ?? ''}" directly, no search needed
• Unknown athlete → call search_athletes, then call show_athlete with the result
• "book", "meet", "reserve" → call open_booking (navigates to profile + booking section)
• Always call show_athlete to display a clickable card — don't just name an athlete in text

STYLE: Max 2 sentences. Enthusiastic but brief. End with one suggested action.
FORMAT: Plain text only — no markdown, no asterisks for bold, no flag emojis, no country codes. Athletes' names stand alone without decorations.`
  }

  if (p.mode === 'athlete') {
    return `You are Studio AI, the private performance assistant inside My Match Olympics Athlete Studio.

MANAGING: ${p.managingAthleteName ?? 'athlete'} ${p.managingAthleteSport ? `(${p.managingAthleteSport})` : ''}

Help the athlete grow their fan economy: content strategy, course design, availability, and sponsor relationships.
Call navigate_to to take them directly to the right dashboard section.
Available sections: dashboard, content, courses, availability, offers.

STYLE: Strategic, concise, like a sports business advisor. One concrete action per message.
FORMAT: Plain text only — no markdown, no asterisks, no bold formatting.`
  }

  // business
  return `You are Scout AI, the sponsorship intelligence assistant for My Match Olympics.

BRAND: ${p.brandName ?? 'your brand'} ${p.brandCategory ? `(${p.brandCategory})` : ''}

Help brands find ideal Olympic athlete partners. Search athletes by sport/country/name, then show their cards.
Always call show_athlete after searching so the user sees a clickable profile.

STYLE: Brand-partner language. Focus on audience fit, brand safety, ROI. 2 sentences max.
FORMAT: Plain text only — no markdown, no asterisks, no bold formatting, no flag emojis.`
}

// ── Tools ─────────────────────────────────────────────────────────────────────

const SEARCH: ToolDef = {
  type: 'function',
  function: {
    name: 'search_athletes',
    description: 'Search Olympic athletes by name, sport, or country. Use this first when you don\'t know the athlete_id.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name, sport, or country' },
        limit: { type: 'number', description: 'Max results 1–5, default 3' },
      },
      required: ['query'],
    },
  },
}

const SHOW: ToolDef = {
  type: 'function',
  function: {
    name: 'show_athlete',
    description: 'Show a clickable athlete card in the chat. The user can tap it to open the full profile. Always call this after search or when you know the athlete ID.',
    parameters: {
      type: 'object',
      properties: {
        athlete_id:   { type: 'string', description: 'Athlete ID (from search results or context)' },
        athlete_name: { type: 'string', description: 'Athlete name for fallback lookup' },
      },
      required: ['athlete_id'],
    },
  },
}

const BOOK: ToolDef = {
  type: 'function',
  function: {
    name: 'open_booking',
    description: 'Navigate to the athlete\'s profile and highlight booking options. Use when the user wants to book, meet, or reserve an experience.',
    parameters: {
      type: 'object',
      properties: {
        athlete_id: { type: 'string', description: 'The athlete to book with' },
      },
      required: ['athlete_id'],
    },
  },
}

const NAVIGATE: ToolDef = {
  type: 'function',
  function: {
    name: 'navigate_to',
    description: 'Navigate to a section of the athlete dashboard.',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: 'Target section',
          enum: ['dashboard', 'content', 'courses', 'availability', 'offers'],
        },
      },
      required: ['section'],
    },
  },
}

const TOOLS: Record<Mode, ToolDef[]> = {
  fan:      [SEARCH, SHOW, BOOK],
  athlete:  [NAVIGATE],
  business: [SEARCH, SHOW],
}

// ── Welcome prompts ───────────────────────────────────────────────────────────

const WELCOME = {
  fan:      { greeting: "Hi! I'm Maya — your Olympic fan assistant. What can I help you discover?",
              prompts: ['Show me Caeleb Dressel', 'Best swimmers to follow', 'Book with this athlete'] },
  athlete:  { greeting: "Welcome to Studio AI. Let's grow your fan economy.",
              prompts: ['What should I post today?', 'Help me set up a course', 'Open my offers'] },
  business: { greeting: "I'm Scout AI. Tell me about your brand and I'll find the perfect athlete partners.",
              prompts: ['Find top swimmers', 'Athletes for a sportswear campaign', 'Show 5-star medalists'] },
}

// ── Markdown cleanup ──────────────────────────────────────────────────────────

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → plain
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → plain
    .replace(/`(.+?)`/g, '$1')          // `code` → plain
    .replace(/#{1,6}\s+/g, '')          // # headings → remove hashes
    .trim()
}

// ── Unique IDs ────────────────────────────────────────────────────────────────

let _n = 0
const uid = () => `ai${++_n}`

// ── Main component ────────────────────────────────────────────────────────────

export default function AIAssistant(props: AIAssistantProps) {
  const { mode, onViewProfile, onOpenBooking, onNavigateTo } = props
  const cfg = MODES[mode]
  const { Icon } = cfg

  const [open, setOpen]    = useState(false)
  const [input, setInput]  = useState('')
  const [busy, setBusy]    = useState(false)
  const [msgs, setMsgs]    = useState<UIMsg[]>([])

  const llmHistory = useRef<LLMMessage[]>([])
  const cache      = useRef(new Map<string, AthleteCard>())
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Keep current athlete in cache
  useEffect(() => {
    if (props.currentAthleteId && props.currentAthleteName) {
      cache.current.set(props.currentAthleteId, {
        id:      props.currentAthleteId,
        name:    props.currentAthleteName,
        sport:   props.currentAthleteSport ?? '',
        country: props.currentAthleteCountry ?? '',
        flag:    '',
      })
    }
  }, [props.currentAthleteId, props.currentAthleteName, props.currentAthleteSport, props.currentAthleteCountry])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 320) }, [open])

  // ── Athlete lookup helpers ──────────────────────────────────────────────────

  async function searchAthletes(query: string, limit = 3): Promise<AthleteCard[]> {
    const page = await api.getAthletes({ search: query, limit })
    return page.items.map(a => {
      const c: AthleteCard = { id: a.id, name: a.name, sport: a.sport, country: a.country, flag: a.flag }
      cache.current.set(a.id, c)
      return c
    })
  }

  async function resolveAthlete(id: string, name?: string): Promise<AthleteCard | null> {
    if (cache.current.has(id)) return cache.current.get(id)!
    try {
      const a = await api.getAthlete(id)
      const c: AthleteCard = { id: a.id, name: a.name, sport: a.sport, country: a.country, flag: a.flag }
      cache.current.set(a.id, c)
      return c
    } catch {
      const found = name ? await searchAthletes(name, 1) : []
      return found[0] ?? null
    }
  }

  // ── Agent loop ──────────────────────────────────────────────────────────────

  const send = useCallback(async (text: string) => {
    if (busy || !text.trim()) return
    const trimmed = text.trim()
    setInput('')
    setBusy(true)

    const typingId = uid()
    setMsgs(prev => [
      ...prev,
      { id: uid(), role: 'user', content: trimmed },
      { id: typingId, role: 'typing' },
    ])

    const messages: LLMMessage[] = [
      { role: 'system', content: buildSystem(props) },
      ...llmHistory.current,
      { role: 'user', content: trimmed },
    ]

    const pendingUi: UIMsg[] = []
    let shouldClose = false

    try {
      for (let iter = 0; iter < 4; iter++) {
        const response = await llmChat(messages, TOOLS[mode])
        messages.push(response)

        if (!response.tool_calls?.length) {
          if (response.content) {
            pendingUi.push({ id: uid(), role: 'assistant', content: response.content })
          }
          break
        }

        for (const tc of response.tool_calls) {
          const args  = JSON.parse(tc.function.arguments) as Record<string, unknown>
          const fname = tc.function.name
          let result  = ''

          if (fname === 'search_athletes') {
            const hits = await searchAthletes(String(args.query), Number(args.limit ?? 3))
            result = JSON.stringify(hits)
          }

          else if (fname === 'show_athlete') {
            const athlete = await resolveAthlete(
              String(args.athlete_id),
              args.athlete_name ? String(args.athlete_name) : undefined
            )
            if (athlete) pendingUi.push({ id: uid(), role: 'athlete_card', athlete })
            result = athlete ? `Card shown: ${athlete.name}` : 'Athlete not found'
          }

          else if (fname === 'open_booking') {
            const aid = String(args.athlete_id)
            onViewProfile?.(aid)
            onOpenBooking?.(aid)
            shouldClose = true
            result = 'Profile opened with booking'
          }

          else if (fname === 'navigate_to') {
            onNavigateTo?.(String(args.section))
            shouldClose = true
            result = `Navigated to ${args.section}`
          }

          messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
      }
    } catch {
      pendingUi.push({ id: uid(), role: 'assistant', content: "Hmm, something went wrong. Try again in a moment." })
    } finally {
      llmHistory.current = messages.slice(1) // drop system prompt
      setMsgs(prev => [...prev.filter(m => m.id !== typingId), ...pendingUi])
      setBusy(false)
      if (shouldClose) setTimeout(() => setOpen(false), 600)
    }
  }, [busy, mode, props, onViewProfile, onOpenBooking, onNavigateTo])

  const submit = (e: React.FormEvent) => { e.preventDefault(); send(input) }

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: cfg.color, boxShadow: `0 8px 32px ${cfg.color}55` }}
            title={`Open ${cfg.name}`}
          >
            <MessageCircle size={22} color="#000" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="panel"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0,      opacity: 1 }}
              exit={{ y: '100%',    opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              className="fixed z-50 flex flex-col"
              style={{
                bottom: 0, right: 0, left: 0,
                // On sm+: floating card anchored bottom-right
                // Use inline style for responsive override via JS (simpler than Tailwind breakpoint here)
                width: '100%',
                maxWidth: 420,
                height: 'min(82vh, 640px)',
                marginLeft: 'auto',
                borderRadius: '20px 20px 0 0',
                background: '#13141A',
                border: `1px solid ${cfg.border}`,
                borderBottom: 'none',
                boxShadow: `0 -8px 48px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.border}`,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${cfg.color}1a`, border: `1px solid ${cfg.border}` }}
                >
                  <Icon size={16} color={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight" style={{ color: cfg.color }}>{cfg.name}</p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{cfg.role}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ scrollbarWidth: 'none' }}
              >
                {msgs.length === 0 && (
                  <Welcome mode={mode} cfg={cfg} onPrompt={send} />
                )}
                {msgs.map(msg => (
                  <Bubble key={msg.id} msg={msg} cfg={cfg} onViewProfile={onViewProfile} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={submit}
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{ borderTop: `1px solid ${cfg.border}` }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={getPlaceholder(mode, props)}
                  disabled={busy}
                  className="flex-1 bg-transparent text-sm outline-none placeholder-white/25"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: input.trim() && !busy ? cfg.color : 'rgba(255,255,255,0.07)' }}
                >
                  {busy
                    ? <Loader2 size={14} color="rgba(255,255,255,0.5)" className="animate-spin" />
                    : <Send size={14} color={input.trim() ? '#000' : 'rgba(255,255,255,0.35)'} />
                  }
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function getPlaceholder(mode: Mode, p: AIAssistantProps) {
  if (mode === 'fan')      return p.currentAthleteName ? `Ask about ${p.currentAthleteName}…` : 'Ask about any athlete…'
  if (mode === 'athlete')  return 'How can I grow my fan base?'
  return 'Find athletes for your campaign…'
}

function Welcome({ mode, cfg, onPrompt }: { mode: Mode; cfg: ModeCfg; onPrompt: (t: string) => void }) {
  const w = WELCOME[mode]
  const { Icon } = cfg
  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 items-start">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
          style={{ background: `${cfg.color}1a`, border: `1px solid ${cfg.border}` }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', maxWidth: 280 }}>
          {w.greeting}
        </div>
      </div>
      <div className="flex flex-wrap gap-2" style={{ paddingLeft: 36 }}>
        {w.prompts.map(prompt => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-75 active:scale-95"
            style={{ borderColor: cfg.border, color: cfg.color, background: cfg.bg }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({
  msg, cfg, onViewProfile,
}: {
  msg: UIMsg; cfg: ModeCfg; onViewProfile?: (id: string) => void
}) {
  const { Icon } = cfg

  if (msg.role === 'typing') {
    return (
      <div className="flex gap-2.5 items-end">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: `${cfg.color}1a` }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <span className="flex gap-1.5 items-center">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: cfg.color, animationDelay: `${i * 0.15}s`, animationDuration: '1s' }} />
            ))}
          </span>
        </div>
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm font-medium"
          style={{ background: cfg.color, color: '#000', maxWidth: 280 }}>
          {msg.content}
        </div>
      </div>
    )
  }

  if (msg.role === 'assistant') {
    return (
      <div className="flex gap-2.5 items-start">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
          style={{ background: `${cfg.color}1a`, border: `1px solid ${cfg.border}` }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', maxWidth: 280 }}>
          {cleanText(msg.content)}
        </div>
      </div>
    )
  }

  if (msg.role === 'athlete_card') {
    const { athlete } = msg
    return (
      <div style={{ paddingLeft: 36 }}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onViewProfile?.(athlete.id)}
          className="rounded-2xl overflow-hidden cursor-pointer group transition-opacity hover:opacity-80 active:scale-98"
          style={{
            border: `1px solid ${cfg.border}`,
            background: 'rgba(255,255,255,0.04)',
            maxWidth: 260,
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-2xl flex-shrink-0">{athlete.flag || '🏅'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">{athlete.name}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {athlete.sport} · {athlete.country}
              </p>
            </div>
            <ChevronRight size={14} color={cfg.color} className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div
            className="px-4 py-2 text-xs font-semibold"
            style={{ background: `${cfg.color}18`, color: cfg.color, borderTop: `1px solid ${cfg.border}` }}
          >
            Tap to view full profile →
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
