import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/store'

interface Props {
  /** Accent color for the button + modal. */
  color: string
  /** Title shown on the modal and used as the native-share title. */
  title: string
  /** Caption used for "copy" and as native-share text. */
  caption: string
  /** Base name for the downloaded PNG (no extension). */
  filenameBase: string
  /** Produces the PNG blob to preview/share. */
  build: () => Promise<Blob>
  /** Button label. */
  buttonLabel?: string
  /** Analytics label for this share surface. */
  eventLabel?: string
}

export default function ShareButton({
  color, title, caption, filenameBase, build, buttonLabel = 'Share', eventLabel = 'card',
}: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const openModal = async () => {
    setOpen(true)
    setBusy(true)
    try {
      const b = await build()
      setBlob(b)
      setUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b) })
      trackEvent('share_opened', { surface: eventLabel })
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setOpen(false)
    if (url) URL.revokeObjectURL(url)
    setUrl(null); setBlob(null); setCopied(false)
  }

  const file = blob ? new File([blob], `${filenameBase}.png`, { type: 'image/png' }) : null
  const canShareFile = !!file && typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [file] })

  const doShare = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title, text: caption })
      trackEvent('shared', { surface: eventLabel, method: 'native' })
    } catch { /* user cancelled */ }
  }

  const doDownload = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${filenameBase}.png`
    a.click()
    trackEvent('shared', { surface: eventLabel, method: 'download' })
  }

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      trackEvent('shared', { surface: eventLabel, method: 'copy' })
    } catch { /* no clipboard */ }
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all"
        style={{ background: `${color}1F`, color, border: `1px solid ${color}45` }}
      >
        📤 {buttonLabel}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-5"
              style={{ background: '#0D0D2B', border: `1px solid ${color}40` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-2xl text-white tracking-wide">SHARE</h3>
                <button onClick={close} className="text-white/30 hover:text-white/70 text-lg">✕</button>
              </div>

              <div className="rounded-2xl overflow-hidden mb-4 bg-black/40 aspect-square flex items-center justify-center">
                {busy || !url
                  ? <div className="text-white/30 text-sm animate-pulse">Generating card…</div>
                  : <img src={url} alt="Share card" className="w-full h-full object-contain" />}
              </div>

              <div className="space-y-2">
                {canShareFile && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={doShare} disabled={busy}
                    className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#0D0D2B' }}>
                    📲 Share…
                  </motion.button>
                )}
                <div className="flex gap-2">
                  <button onClick={doDownload} disabled={busy}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                    style={{ background: `${color}1A`, color, border: `1px solid ${color}40` }}>
                    ⬇ Download
                  </button>
                  <button onClick={doCopy} disabled={busy}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 text-white/70"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {copied ? '✓ Copied' : '🔗 Copy caption'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
