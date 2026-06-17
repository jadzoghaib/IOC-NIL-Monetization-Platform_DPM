import { useState, useRef, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useStoreVersion, listMessages, addMessage, type ThreadRole } from '../lib/store'

interface Props {
  threadId: string
  /** The viewer's role — their messages align right. */
  me: ThreadRole
  /** Friendly name for the other party, shown on their bubbles. */
  otherName?: string
  placeholder?: string
  accent?: string
  /** Optional action row (e.g. Accept / Decline) rendered above the composer. */
  actions?: ReactNode
  /** Quick-reply suggestions inserted into the composer when clicked. */
  quickReplies?: string[]
  emptyHint?: string
  maxHeight?: number
}

const ROLE_NAME: Record<ThreadRole, string> = {
  athlete: 'Athlete', sponsor: 'Sponsor', fan: 'You', system: 'System',
}

export default function ChatThread({
  threadId, me, otherName, placeholder = 'Write a message…', accent = '#FFD700',
  actions, quickReplies, emptyHint, maxHeight = 320,
}: Props) {
  useStoreVersion()
  const messages = listMessages(threadId)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  const send = () => {
    const t = draft.trim()
    if (!t) return
    addMessage(threadId, me, t)
    setDraft('')
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
      <div ref={scrollRef} className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight }}>
        {messages.length === 0 && (
          <div className="text-center text-white/25 text-xs py-6">{emptyHint ?? 'No messages yet — say hello.'}</div>
        )}
        {messages.map(m => {
          if (m.role === 'system') {
            return <div key={m.id} className="text-center text-[11px] text-white/30 py-1">{m.text}</div>
          }
          const mine = m.role === me
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {!mine && <div className="text-[10px] text-white/30 mb-0.5 px-1">{otherName ?? ROLE_NAME[m.role]}</div>}
                <div className="rounded-2xl px-3 py-2 text-sm leading-snug"
                  style={mine
                    ? { background: `${accent}22`, color: '#fff', border: `1px solid ${accent}40`, borderBottomRightRadius: 6 }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: 6 }}>
                  {m.text}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {actions && <div className="px-3 pb-2">{actions}</div>}

      {quickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {quickReplies.map(q => (
            <button key={q} onClick={() => setDraft(q)}
              className="px-2.5 py-1 rounded-full text-[11px] text-white/50 hover:text-white/80 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
          placeholder={placeholder}
          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/25 transition-colors"
        />
        <motion.button whileTap={{ scale: 0.95 }} onClick={send} disabled={!draft.trim()}
          className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-30 transition-all"
          style={{ background: accent, color: '#0D0D2B' }}>
          Send
        </motion.button>
      </div>
    </div>
  )
}
