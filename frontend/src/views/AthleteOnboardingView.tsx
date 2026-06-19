import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AthleteProfile, SocialAccount } from '../hooks/useAthleteProfile'
import { CATEGORIES, DEAL_TYPES, REGIONS, LANGUAGES } from '../hooks/useAthleteProfile'

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  profile:        AthleteProfile
  update:         (patch: Partial<AthleteProfile>) => void
  connectSocial:  (p: 'instagram'|'tiktok'|'youtube'|'twitter', h: string) => void
  onDone:         () => void
}

// ── Step progress bar ──────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="h-1 flex-1 rounded-full"
          animate={{ background: i <= current ? '#F97316' : 'rgba(255,255,255,0.08)' }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHead({ step, icon, title, sub }: { step: number; icon: string; title: string; sub: string }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-2">
        Step {step} of 5
      </div>
      <div className="text-3xl mb-2">{icon}</div>
      <h2 className="font-display text-3xl text-white tracking-wide mb-1">{title}</h2>
      <p className="text-white/40 text-sm leading-relaxed">{sub}</p>
    </div>
  )
}

// ── Toggle chip ────────────────────────────────────────────────────────────
function Chip({
  label, active, onClick, color = '#F97316',
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
      style={active
        ? { background: `${color}20`, color, borderColor: `${color}50` }
        : { background: 'transparent', color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.1)' }
      }
    >
      {label}
    </motion.button>
  )
}

// ── Social connect card ────────────────────────────────────────────────────
function SocialCard({
  icon, platform, label, account, onConnect, onDisconnect,
}: {
  icon: string; platform: string; label: string
  account?: SocialAccount
  onConnect:    (handle: string) => void
  onDisconnect: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [input,   setInput]   = useState(account?.handle || '')

  const fmt = (n?: number) =>
    !n ? '—'
    : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000     ? `${(n / 1_000).toFixed(0)}K`
    : `${n}`

  if (account?.connected) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
      >
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-orange-400 font-bold uppercase tracking-wider">{label}</div>
          <div className="text-white font-semibold">@{account.handle}</div>
          <div className="text-white/40 text-xs mt-0.5">
            {fmt(account.followers)} followers · {account.engagement}% avg engagement
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
          </div>
          <button
            onClick={onDisconnect}
            className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white/70">{label}</div>
          <div className="text-xs text-white/30">Link your {platform} account</div>
        </div>
        {!editing && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setEditing(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}
          >
            Connect
          </motion.button>
        )}
      </div>
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-1">
              <div className="flex-1 flex items-center bg-white/[0.05] border border-white/10 rounded-xl px-3 gap-1.5">
                <span className="text-white/30 text-sm">@</span>
                <input
                  autoFocus
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && input.trim() && (onConnect(input.trim()), setEditing(false))}
                  placeholder={`your${platform}handle`}
                  className="flex-1 bg-transparent text-sm text-white py-2.5 outline-none placeholder-white/20"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                disabled={!input.trim()}
                onClick={() => { onConnect(input.trim()); setEditing(false) }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#F97316,#FB923C)', color: '#000' }}
              >
                Save
              </motion.button>
              <button onClick={() => setEditing(false)} className="px-3 text-white/30 hover:text-white/60 text-xs">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Price range input ──────────────────────────────────────────────────────
function PriceRange({
  label, icon, value, onChange,
}: {
  label: string; icon: string
  value?: { min: number; max: number }
  onChange: (v: { min: number; max: number } | undefined) => void
}) {
  const [enabled, setEnabled] = useState(!!value)
  const [min, setMin] = useState(value?.min ?? 0)
  const [max, setMax] = useState(value?.max ?? 0)

  const toggle = (v: boolean) => {
    setEnabled(v)
    onChange(v ? { min, max } : undefined)
  }

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: enabled ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${enabled ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold text-white/80">{label}</span>
        </div>
        <button
          onClick={() => toggle(!enabled)}
          className={`relative w-10 h-5 rounded-full transition-all ${enabled ? 'bg-orange-500' : 'bg-white/10'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
          >
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1">
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Minimum (USD)</div>
                <input
                  type="number" value={min} min={0} step={100}
                  onChange={e => { setMin(+e.target.value); onChange({ min: +e.target.value, max }) }}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                />
              </div>
              <div className="text-white/20 pt-5">–</div>
              <div className="flex-1">
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Maximum (USD)</div>
                <input
                  type="number" value={max} min={0} step={100}
                  onChange={e => { setMax(+e.target.value); onChange({ min, max: +e.target.value }) }}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Athlete search step ────────────────────────────────────────────────────
function StepIdentity({ profile, update }: Pick<Props, 'profile' | 'update'>) {
  const [query, setQuery]     = useState(profile.athleteName || '')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const search = async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const r = await fetch(`/api/athletes?search=${encodeURIComponent(q)}&limit=8`)
      const d = await r.json()
      setResults(d.items || [])
    } catch {}
    setSearching(false)
  }

  const pick = (a: any) => {
    update({
      athleteId:   a.id,
      athleteName: a.name,
      sport:       a.sport,
      flag:        a.flag,
      country:     a.country,
      thumbnail:   a.thumbnail,
    })
    setQuery(a.name)
    setResults([])
  }

  return (
    <div>
      <SectionHead step={1} icon="🏅" title="FIND YOUR PROFILE"
        sub="Search for your name in our athlete database to link your Olympic record." />

      <div className="relative mb-4">
        <input
          value={query} onChange={e => search(e.target.value)}
          placeholder="Search your name, e.g. Armand Duplantis…"
          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/25 outline-none focus:border-orange-500/40 transition-colors text-sm"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs animate-pulse">
            Searching…
          </div>
        )}
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden mb-4"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-card)' }}
          >
            {results.map((a, i) => (
              <motion.button
                key={a.id} whileHover={{ backgroundColor: 'rgba(249,115,22,0.08)' }}
                onClick={() => pick(a)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 transition-colors text-left"
              >
                {a.thumbnail
                  ? <img src={a.thumbnail} alt={a.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-base flex-shrink-0">{a.flag}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{a.name}</div>
                  <div className="text-white/40 text-xs">{a.flag} {a.country} · {a.sport}</div>
                </div>
                {a.is_medalist && <span className="text-gold text-xs flex-shrink-0">🏅</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {profile.athleteId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
        >
          {profile.thumbnail
            ? <img src={profile.thumbnail} alt={profile.athleteName} className="w-14 h-14 rounded-xl object-cover" />
            : <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">{profile.flag}</div>
          }
          <div>
            <div className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-0.5">Profile linked ✓</div>
            <div className="text-white font-bold">{profile.athleteName}</div>
            <div className="text-white/40 text-sm">{profile.flag} {profile.country} · {profile.sport}</div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── Main onboarding component ──────────────────────────────────────────────
export default function AthleteOnboardingView({ profile, update, connectSocial, onDone }: Props) {
  const [step, setStep] = useState(0)
  const TOTAL = 5

  const next = () => step < TOTAL - 1 ? setStep(s => s + 1) : (update({ completedOnboarding: true }), onDone())
  const back = () => step > 0 && setStep(s => s - 1)

  const canAdvance = () => {
    if (step === 0) return !!profile.athleteId
    return true
  }

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  return (
    <div className="max-w-xl mx-auto py-4">
      <StepBar current={step} total={TOTAL} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── Step 0: Identity ── */}
          {step === 0 && <StepIdentity profile={profile} update={update} />}

          {/* ── Step 1: Social accounts ── */}
          {step === 1 && (
            <div>
              <SectionHead step={2} icon="📱" title="CONNECT YOUR SOCIALS"
                sub="Link your accounts so we can pull your real follower count and engagement rate. Skip any you don't use." />
              <div className="space-y-3">
                {([
                  { platform: 'instagram' as const, icon: '📸', label: 'Instagram' },
                  { platform: 'tiktok'    as const, icon: '🎵', label: 'TikTok'    },
                  { platform: 'youtube'   as const, icon: '▶️',  label: 'YouTube'   },
                  { platform: 'twitter'   as const, icon: '𝕏',   label: 'X / Twitter' },
                ]).map(({ platform, icon, label }) => (
                  <SocialCard
                    key={platform}
                    icon={icon} platform={platform} label={label}
                    account={profile[platform]}
                    onConnect={h => connectSocial(platform, h)}
                    onDisconnect={() => update({ [platform]: undefined })}
                  />
                ))}
              </div>
              <p className="text-white/25 text-xs mt-4 text-center">
                We only read public follower/engagement data — no posting access, ever.
              </p>
            </div>
          )}

          {/* ── Step 2: Categories & availability ── */}
          {step === 2 && (
            <div>
              <SectionHead step={3} icon="📋" title="YOUR BRAND AVAILABILITY"
                sub="Tell us which sponsorship categories are already taken, and which you'd never consider. Businesses see this instantly." />

              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                  Categories already contracted (taken)
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <Chip key={c} label={c}
                      active={profile.categoriesTaken.includes(c)}
                      onClick={() => update({ categoriesTaken: toggle(profile.categoriesTaken, c) })}
                      color="#EF4444"
                    />
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                  Categories you'd never accept
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <Chip key={c} label={c}
                      active={profile.categoriesBlocked.includes(c)}
                      onClick={() => update({ categoriesBlocked: toggle(profile.categoriesBlocked, c) })}
                      color="#6B7280"
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                  Deal types you're open to
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEAL_TYPES.map(d => (
                    <Chip key={d.id} label={`${d.icon} ${d.label}`}
                      active={profile.dealTypesOpen.includes(d.id)}
                      onClick={() => update({ dealTypesOpen: toggle(profile.dealTypesOpen, d.id) })}
                      color="#F97316"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Pricing ── */}
          {step === 3 && (
            <div>
              <SectionHead step={4} icon="💰" title="YOUR ASKING PRICES"
                sub="Set your own rate ranges. Businesses see your actual figures instead of market estimates. Toggle on any deal type you want to price." />
              <div className="space-y-3">
                <PriceRange label="Single Social Post" icon="📱"
                  value={profile.pricingSocialPost}
                  onChange={v => update({ pricingSocialPost: v })} />
                <PriceRange label="Event Appearance" icon="🎤"
                  value={profile.pricingEvent}
                  onChange={v => update({ pricingEvent: v })} />
                <PriceRange label="Brand Ambassador (per month)" icon="🤝"
                  value={profile.pricingAmbassador}
                  onChange={v => update({ pricingAmbassador: v })} />
              </div>
              <p className="text-white/25 text-xs mt-4 text-center">
                Prices are only visible to verified business accounts — never public.
              </p>
            </div>
          )}

          {/* ── Step 4: Story ── */}
          {step === 4 && (
            <div>
              <SectionHead step={5} icon="✍️" title="YOUR STORY"
                sub="Write your own bio in your words. Tell brands what makes you unique — your values, your mission, your audience." />

              <textarea
                value={profile.bio}
                onChange={e => update({ bio: e.target.value })}
                rows={5}
                placeholder="e.g. I compete for more than medals — I want to inspire a generation to push beyond their limits. My audience is young, global, and passionate about performance and authenticity..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/40 resize-none mb-4 transition-colors leading-relaxed"
              />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Languages</div>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGES.map(l => (
                      <Chip key={l} label={l}
                        active={profile.languages.includes(l)}
                        onClick={() => update({ languages: toggle(profile.languages, l) })}
                        color="#F97316"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Available in</div>
                  <div className="flex flex-wrap gap-1.5">
                    {REGIONS.map(r => (
                      <Chip key={r} label={r}
                        active={profile.regions.includes(r)}
                        onClick={() => update({ regions: toggle(profile.regions, r) })}
                        color="#F97316"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.06]">
        <button
          onClick={back}
          className={`text-sm text-white/40 hover:text-white/70 transition-colors ${step === 0 ? 'invisible' : ''}`}
        >
          ← Back
        </button>

        <motion.button
          whileHover={{ scale: canAdvance() ? 1.03 : 1 }}
          whileTap={{ scale: canAdvance() ? 0.97 : 1 }}
          onClick={next}
          disabled={!canAdvance()}
          className="px-8 py-3 rounded-2xl text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: canAdvance() ? 'linear-gradient(135deg,#F97316,#FB923C)' : 'rgba(255,255,255,0.08)', color: canAdvance() ? '#000' : 'rgba(255,255,255,0.3)' }}
        >
          {step === TOTAL - 1 ? 'Go to my dashboard →' : 'Continue →'}
        </motion.button>
      </div>
    </div>
  )
}
