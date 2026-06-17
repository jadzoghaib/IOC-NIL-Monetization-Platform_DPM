import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AthleteProfile } from '../hooks/useAthleteProfile'
import { CATEGORIES, DEAL_TYPES } from '../hooks/useAthleteProfile'

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  profile:           AthleteProfile
  completeness:      number
  onEdit:            () => void
  disconnectSocial:  (p: 'instagram'|'tiktok'|'youtube'|'twitter') => void
}

interface BusinessView {
  marketability_score?: number
  deal_tier?: string
  tier_color?: string
  audience_reach?: number
  engagement_rate?: number
  brand_safety_score?: number
  brand_safety_grade?: string
  deal_estimates?: { social_post?: {min:number;max:number}; event?: {min:number;max:number}; ambassador?: {min:number;max:number} }
  medal_totals?: { gold: number; silver: number; bronze: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
function fmtUSD(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

// ── Circular completeness ring ─────────────────────────────────────────────
function CompletenessRing({ pct }: { pct: number }) {
  const r = 36, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#22C55E' : pct >= 50 ? '#F97316' : '#EF4444'
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <motion.circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ transformOrigin: '48px 48px', rotate: '-90deg' }}
      />
      <text x="48" y="53" textAnchor="middle" fontSize="18" fontWeight="800" fill="white">{pct}%</text>
    </svg>
  )
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-white font-bold text-base">{value}</span>
      <span className="text-white/35 text-[11px] uppercase tracking-wide">{label}</span>
    </div>
  )
}

// ── Social platform card ───────────────────────────────────────────────────
const PLATFORM_META: Record<string, { icon: string; label: string; color: string }> = {
  instagram: { icon: '📸', label: 'Instagram', color: '#E1306C' },
  tiktok:    { icon: '🎵', label: 'TikTok',    color: '#69C9D0' },
  youtube:   { icon: '▶️', label: 'YouTube',   color: '#FF0000' },
  twitter:   { icon: '𝕏',  label: 'X / Twitter', color: '#A0A0A0' },
}

function SocialChip({
  platform, account, onDisconnect,
}: {
  platform: string
  account: { handle: string; followers?: number; engagement?: number; connected: boolean }
  onDisconnect: () => void
}) {
  const meta = PLATFORM_META[platform]
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span className="text-xl flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">@{account.handle}</div>
        {account.followers && (
          <div className="text-white/40 text-xs">
            {fmtNum(account.followers)} followers · {account.engagement}% ER
          </div>
        )}
      </div>
      <button
        onClick={onDisconnect}
        className="text-white/20 hover:text-red-400 text-xs transition-colors flex-shrink-0"
        title="Disconnect"
      >✕</button>
    </div>
  )
}

// ── "How businesses see you" panel ────────────────────────────────────────
function BusinessPreviewPanel({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<BusinessView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!athleteId) { setLoading(false); return }
    fetch(`/api/athletes/${athleteId}/business`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [athleteId])

  if (loading) return (
    <div className="text-white/25 text-sm text-center py-8 animate-pulse">Loading business preview…</div>
  )
  if (!data) return (
    <div className="text-white/20 text-sm text-center py-8">
      No business data yet — complete your profile first.
    </div>
  )

  const score = data.marketability_score ?? 0
  const tierColor = data.tier_color ?? '#A78BFA'
  const de = data.deal_estimates ?? {}

  return (
    <div className="space-y-5">
      {/* Score + tier */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r="30" fill="none"
              stroke={tierColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 30}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - score / 100) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ transformOrigin: '40px 40px', rotate: '-90deg' }}
            />
            <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="800" fill="white">{score}</text>
          </svg>
        </div>
        <div>
          <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Marketability Score</div>
          {data.deal_tier && (
            <div
              className="inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
              style={{ background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}35` }}
            >
              {data.deal_tier}
            </div>
          )}
          {data.audience_reach && (
            <div className="text-white/50 text-xs mt-1.5">
              {fmtNum(data.audience_reach)} estimated reach · {data.engagement_rate}% ER
            </div>
          )}
        </div>
      </div>

      {/* Brand safety */}
      {data.brand_safety_grade && (
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs uppercase tracking-wider">Brand Safety</span>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-black"
            style={{
              background: data.brand_safety_grade === 'A+' || data.brand_safety_grade === 'A'
                ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
              color: data.brand_safety_grade === 'A+' || data.brand_safety_grade === 'A'
                ? '#22C55E' : '#F97316',
            }}
          >
            {data.brand_safety_grade}
          </span>
          <span className="text-white/30 text-xs">{data.brand_safety_score}/100</span>
        </div>
      )}

      {/* Deal estimates */}
      {(de.social_post || de.event || de.ambassador) && (
        <div>
          <div className="text-white/35 text-[11px] uppercase tracking-widest mb-2">Estimated Deal Values</div>
          <div className="space-y-1.5">
            {de.social_post && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">📱 Social Post</span>
                <span className="text-white font-semibold">{fmtUSD(de.social_post.min)} – {fmtUSD(de.social_post.max)}</span>
              </div>
            )}
            {de.event && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">🎤 Event Appearance</span>
                <span className="text-white font-semibold">{fmtUSD(de.event.min)} – {fmtUSD(de.event.max)}</span>
              </div>
            )}
            {de.ambassador && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">🤝 Brand Ambassador</span>
                <span className="text-white font-semibold">{fmtUSD(de.ambassador.min)} – {fmtUSD(de.ambassador.max)}/mo</span>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-white/20 text-[11px] italic">
        Model-generated estimates — updated as you complete your profile.
      </p>
    </div>
  )
}

// ── News feed ──────────────────────────────────────────────────────────────
interface Article { title: string; url: string; source?: string; published?: string; summary?: string }

function NewsSection({ athleteId }: { athleteId: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!athleteId) { setLoading(false); return }
    fetch(`/api/news/${athleteId}`)
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [athleteId])

  if (loading) return <div className="text-white/25 text-sm animate-pulse">Loading news…</div>
  if (!articles.length) return <div className="text-white/25 text-sm">No news articles yet.</div>

  return (
    <div className="space-y-3">
      {articles.slice(0, 5).map((a, i) => (
        <a
          key={i} href={a.url} target="_blank" rel="noopener noreferrer"
          className="block p-3 rounded-xl transition-colors hover:bg-white/[0.04]"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-white text-sm font-medium leading-snug mb-1 line-clamp-2">{a.title}</div>
          {a.summary && <div className="text-white/35 text-xs line-clamp-2">{a.summary}</div>}
          <div className="text-white/20 text-[11px] mt-1">{a.source} {a.published && `· ${a.published}`}</div>
        </a>
      ))}
    </div>
  )
}

// ── Completeness prompt ────────────────────────────────────────────────────
const PROMPTS: { threshold: number; icon: string; msg: string }[] = [
  { threshold: 0,  icon: '🔴', msg: 'Add your athlete identity to get started.' },
  { threshold: 20, icon: '🟠', msg: 'Connect at least one social account so brands can see your reach.' },
  { threshold: 40, icon: '🟡', msg: 'Mark your category availability — brands filter by exclusivity.' },
  { threshold: 60, icon: '🟡', msg: 'Add pricing ranges to receive relevant partnership offers.' },
  { threshold: 80, icon: '🟢', msg: 'Almost there! Add a bio to complete your profile.' },
]

function CompletenessPrompt({ pct, onEdit }: { pct: number; onEdit: () => void }) {
  if (pct >= 100) return null
  const prompt = [...PROMPTS].reverse().find(p => pct >= p.threshold) ?? PROMPTS[0]
  return (
    <button
      onClick={onEdit}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-orange-500/10"
      style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}
    >
      <span className="text-lg">{prompt.icon}</span>
      <span className="text-orange-300 text-sm flex-1">{prompt.msg}</span>
      <span className="text-orange-400/60 text-xs">Edit →</span>
    </button>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function AthleteDashboardView({ profile, completeness, onEdit, disconnectSocial }: Props) {
  const [tab, setTab] = useState<'overview' | 'business' | 'news'>('overview')

  const socials = (['instagram', 'tiktok', 'youtube', 'twitter'] as const)
    .filter(p => profile[p]?.connected)

  const medals = (profile as any).medal_totals as { gold: number; silver: number; bronze: number } | undefined

  // total social reach
  const totalReach = socials.reduce((sum, p) => sum + (profile[p]?.followers ?? 0), 0)

  const dealTypeLabels: Record<string, string> = Object.fromEntries(
    [{ id:'social_post',label:'Social Posts'},{ id:'event_appearance',label:'Event Appearances'},
     { id:'brand_ambassador',label:'Brand Ambassador'},{ id:'content_creation',label:'Content Creation'},
     { id:'product_collab',label:'Product Collab'}].map(d => [d.id, d.label])
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Hero card ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
      >
        <div className="flex items-start gap-5">
          {/* Avatar / flag */}
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/[0.06] flex-shrink-0 flex items-center justify-center text-3xl">
            {profile.thumbnail
              ? <img src={profile.thumbnail} alt={profile.athleteName} className="w-full h-full object-cover" />
              : profile.flag || '🏅'}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl text-white tracking-wide truncate">
              {profile.athleteName || 'Your Profile'}
            </h2>
            {profile.sport && (
              <div className="text-orange-400 text-sm font-semibold">{profile.sport}</div>
            )}
            {profile.country && (
              <div className="text-white/40 text-xs mt-0.5">{profile.flag} {profile.country}</div>
            )}
            {medals && (medals.gold + medals.silver + medals.bronze) > 0 && (
              <div className="flex gap-2 mt-1.5 text-sm">
                {medals.gold   > 0 && <span>🥇{medals.gold   > 1 ? `×${medals.gold}`   : ''}</span>}
                {medals.silver > 0 && <span>🥈{medals.silver > 1 ? `×${medals.silver}` : ''}</span>}
                {medals.bronze > 0 && <span>🥉{medals.bronze > 1 ? `×${medals.bronze}` : ''}</span>}
              </div>
            )}
          </div>

          {/* Completeness ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <CompletenessRing pct={completeness} />
            <div className="text-white/30 text-[11px]">Profile</div>
          </div>
        </div>

        {/* Stats row */}
        {(socials.length > 0 || totalReach > 0) && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <StatPill icon="📡" label="Connected" value={`${socials.length} / 4`} />
            <StatPill icon="👥" label="Total Reach" value={fmtNum(totalReach)} />
            <StatPill
              icon="🛡️"
              label="Open To"
              value={`${profile.dealTypesOpen.length} deals`}
            />
          </div>
        )}
      </div>

      {/* ── Completeness prompt ── */}
      {completeness < 100 && (
        <CompletenessPrompt pct={completeness} onEdit={onEdit} />
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['overview', 'business', 'news'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={tab === t
              ? { background: 'rgba(249,115,22,0.2)', color: '#F97316' }
              : { color: 'rgba(255,255,255,0.3)' }}
          >
            {t === 'overview' ? '📋 Overview' : t === 'business' ? '💼 Business View' : '📰 My News'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {/* Social accounts */}
            <Section title="Connected Socials" action={{ label: 'Edit', onClick: onEdit }}>
              {socials.length === 0 ? (
                <EmptyState msg="No social accounts connected yet." onClick={onEdit} />
              ) : (
                <div className="space-y-2">
                  {socials.map(p => (
                    <SocialChip
                      key={p}
                      platform={p}
                      account={profile[p]!}
                      onDisconnect={() => disconnectSocial(p)}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Category availability */}
            <Section title="Brand Availability" action={{ label: 'Edit', onClick: onEdit }}>
              {profile.categoriesTaken.length === 0 && profile.categoriesBlocked.length === 0 ? (
                <EmptyState msg="No categories set — businesses can't see your exclusivity status." onClick={onEdit} />
              ) : (
                <div className="space-y-3">
                  {profile.categoriesTaken.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-white/25 mb-1.5">Already Contracted</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.categoriesTaken.map(c => (
                          <span key={c} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.categoriesBlocked.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-white/25 mb-1.5">Would Never Accept</div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.categoriesBlocked.map(c => (
                          <span key={c} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-white/25 mb-1.5">Open Deal Types</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.dealTypesOpen.map(d => (
                        <span key={d} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: 'rgba(34,197,94,0.10)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.2)' }}>
                          {dealTypeLabels[d] ?? d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Pricing */}
            <Section title="Your Pricing" action={{ label: 'Edit', onClick: onEdit }}>
              {!profile.pricingSocialPost && !profile.pricingEvent && !profile.pricingAmbassador ? (
                <EmptyState msg="No pricing set — add ranges so businesses know your rates." onClick={onEdit} />
              ) : (
                <div className="space-y-2">
                  {profile.pricingSocialPost && (
                    <PricingRow label="📱 Social Post"      range={profile.pricingSocialPost} />
                  )}
                  {profile.pricingEvent && (
                    <PricingRow label="🎤 Event Appearance" range={profile.pricingEvent} />
                  )}
                  {profile.pricingAmbassador && (
                    <PricingRow label="🤝 Brand Ambassador" range={profile.pricingAmbassador} />
                  )}
                </div>
              )}
            </Section>

            {/* Bio */}
            {profile.bio.trim() && (
              <Section title="Your Story">
                <p className="text-white/60 text-sm leading-relaxed">{profile.bio}</p>
                {profile.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {profile.languages.map(l => (
                      <span key={l} className="px-2 py-0.5 rounded-full text-[11px] text-white/40"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Edit CTA */}
            <button
              onClick={onEdit}
              className="w-full py-3 rounded-xl text-sm font-bold text-orange-400 transition-all hover:bg-orange-500/10"
              style={{ border: '1px solid rgba(249,115,22,0.25)' }}
            >
              ✏️ Edit Profile
            </button>
          </motion.div>
        )}

        {/* ── BUSINESS VIEW TAB ── */}
        {tab === 'business' && (
          <motion.div
            key="business"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          >
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              <div className="text-[11px] uppercase tracking-widest text-purple-400 mb-4 font-black">
                👁 How Businesses See You
              </div>
              {profile.athleteId
                ? <BusinessPreviewPanel athleteId={profile.athleteId} />
                : <div className="text-white/25 text-sm text-center py-6">Complete Step 1 to see your business profile.</div>
              }
            </div>

            <p className="text-white/20 text-xs mt-3 text-center">
              Pricing you set overrides model estimates for verified business accounts.
            </p>
          </motion.div>
        )}

        {/* ── NEWS TAB ── */}
        {tab === 'news' && (
          <motion.div
            key="news"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          >
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-[11px] uppercase tracking-widest text-white/25 mb-4 font-black">
                🗞 What the Media Is Saying
              </div>
              {profile.athleteId
                ? <NewsSection athleteId={profile.athleteId} />
                : <div className="text-white/25 text-sm text-center py-6">Complete Step 1 to load your news feed.</div>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Tiny shared sub-components ─────────────────────────────────────────────
function Section({
  title, action, children,
}: { title: string; action?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-white/30">{title}</div>
        {action && (
          <button onClick={action.onClick} className="text-orange-400/60 hover:text-orange-400 text-xs transition-colors">
            {action.label} →
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ msg, onClick }: { msg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <div className="flex items-center gap-2 text-white/25 text-sm hover:text-white/40 transition-colors">
        <span>＋</span><span>{msg}</span>
      </div>
    </button>
  )
}

function PricingRow({ label, range }: { label: string; range: { min: number; max: number } }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white text-sm font-semibold">
        {fmtUSD(range.min)} – {fmtUSD(range.max)}
      </span>
    </div>
  )
}
