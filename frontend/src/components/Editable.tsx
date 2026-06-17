import { useEffect, useRef, useState } from 'react'

/**
 * Click-to-edit text. Renders as text with a subtle "editable" affordance;
 * clicking turns it into an input/textarea. Enter (or blur) saves, Esc cancels.
 */
export function EditableText({
  value, onSave, placeholder = 'Click to add…', multiline = false, className = '', inputClassName = '',
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  inputClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select?.() } }, [editing])

  const commit = () => { setEditing(false); if (draft !== value) onSave(draft.trim()) }
  const cancel = () => { setEditing(false); setDraft(value) }

  if (editing) {
    const common = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') cancel()
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
      },
      className:
        `w-full bg-white/[0.06] border border-gold/40 rounded-lg px-2 py-1 text-inherit outline-none ${inputClassName}`,
    }
    return multiline
      ? <textarea {...common} rows={3} className={common.className + ' resize-none'} />
      : <input {...common} />
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`cursor-text rounded px-0.5 -mx-0.5 transition-colors hover:bg-white/[0.06] ${className} ${!value ? 'text-white/30 italic' : ''}`}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  )
}

/**
 * Click-to-edit number, with optional formatting for the display state.
 */
export function EditableNumber({
  value, onSave, format, min = 0, prefix = '', className = '',
}: {
  value: number
  onSave: (n: number) => void
  format?: (n: number) => string
  min?: number
  prefix?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select() } }, [editing])

  const commit = () => {
    setEditing(false)
    const n = Math.max(min, Math.round(Number(draft) || 0))
    if (n !== value) onSave(n)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        min={min}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') setEditing(false) }}
        className={`w-28 bg-white/[0.06] border border-gold/40 rounded-lg px-2 py-1 text-inherit outline-none ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      className={`cursor-text rounded px-0.5 -mx-0.5 transition-colors hover:bg-white/[0.06] ${className}`}
      title="Click to edit"
    >
      {prefix}{format ? format(value) : value}
    </span>
  )
}
