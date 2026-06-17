import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { useConnectionQuiz } from '../hooks/useConnectionQuiz'
import type { GamesKey } from '../lib/api'
import { api } from '../lib/api'
import ProgressBar from '../components/ProgressBar'

interface Props {
  quiz: ReturnType<typeof useConnectionQuiz>
  games: GamesKey | null
}

const SUMMER_SPORTS = [
  'Football', 'Basketball', 'Swimming', 'Tennis', 'Track',
  'Martial arts', 'Gymnastics', 'Cycling', 'Volleyball', 'Skiing',
]

const WINTER_SPORTS = [
  'Ice Hockey', 'Skiing', 'Snowboarding', 'Figure Skating', 'Biathlon',
  'Curling', 'Bobsled', 'Track', 'Gymnastics', 'Basketball',
]

const STORY_OPTIONS = [
  { value: 'underdog',      title: 'Underdog comebacks', desc: 'I love when the unexpected one breaks through' },
  { value: 'dominance',     title: 'Pure dominance',     desc: 'Show me the GOATs at their peak' },
  { value: 'culture',       title: 'Cultural pride',     desc: 'Heritage and country mean everything to me' },
  { value: 'mental_health', title: 'Mental health journeys', desc: 'I connect with their mindset and inner battles' },
] as const

const PERSONALITY_OPTIONS = [
  { value: 'hype',  title: 'I hype things up', desc: 'Loud, social, energetic — sport is a celebration' },
  { value: 'grind', title: 'Quiet grinder',    desc: 'Focused, disciplined — process over noise' },
  { value: 'mix',   title: 'A bit of both',    desc: 'Depends on the moment' },
] as const


export default function ConnectionQuizView({ quiz, games }: Props) {
  const COMMON_SPORTS = games === 'milan_2026' ? WINTER_SPORTS : SUMMER_SPORTS
  const [countries, setCountries] = useState<string[]>([])
  const [countryQuery, setCountryQuery] = useState('')
  const [currentQuery, setCurrentQuery] = useState('')

  useEffect(() => {
    api.getCountries(games || undefined)
      .then(r => setCountries(r.countries))
      .catch(() => {
        // Fallback: small static list, user can still type
        setCountries([
          'United States', 'France', 'Italy', 'Lebanon', 'Germany', 'Canada',
          'Japan', 'United Kingdom', 'Australia', 'Brazil', 'Spain', 'Mexico',
          'Netherlands', 'Norway', 'Sweden', 'Egypt', 'Morocco', 'India',
        ])
      })
  }, [games])

  const filteredCountries = useMemo(() => {
    const q = countryQuery.toLowerCase().trim()
    if (!q) return countries.slice(0, 10)
    return countries.filter(c => c.toLowerCase().includes(q)).slice(0, 12)
  }, [countries, countryQuery])

  const filteredCurrent = useMemo(() => {
    const q = currentQuery.toLowerCase().trim()
    if (!q) return countries.slice(0, 10)
    return countries.filter(c => c.toLowerCase().includes(q)).slice(0, 12)
  }, [countries, currentQuery])

  return (
    <motion.div
      key="connection-quiz"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] flex flex-col items-center justify-center max-w-2xl mx-auto"
    >
      <div className="w-full">
        <ProgressBar progress={quiz.progress} total={quiz.total} current={quiz.stepIndex} />

        <AnimatePresence mode="wait">
          <motion.div
            key={quiz.step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-8"
          >
            {quiz.step === 'country' && (
              <Step
                heading="Where are you from?"
                helper="Your home country — this is the strongest signal in matching."
              >
                <CountryPicker
                  value={quiz.profile.country}
                  query={countryQuery}
                  onQuery={setCountryQuery}
                  options={filteredCountries}
                  onPick={c => { quiz.setCountry(c); setCountryQuery('') }}
                  placeholder="Type your country..."
                />
              </Step>
            )}

            {quiz.step === 'current' && (
              <Step
                heading="Where do you live now?"
                helper={`Optional — defaults to ${quiz.profile.country}. Useful if you live abroad.`}
              >
                <CountryPicker
                  value={quiz.profile.current_country}
                  query={currentQuery}
                  onQuery={setCurrentQuery}
                  options={filteredCurrent}
                  onPick={c => { quiz.setCurrent(c); setCurrentQuery('') }}
                  placeholder={`Type a country, or skip to use ${quiz.profile.country}...`}
                />
                <button
                  onClick={() => { quiz.setCurrent(quiz.profile.country); quiz.next() }}
                  className="mt-4 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Same as my home country →
                </button>
              </Step>
            )}

            {quiz.step === 'sports' && (
              <Step
                heading="What sports did you play growing up?"
                helper="Pick any that apply. We'll prefer athletes from these sports."
              >
                <div className="flex flex-wrap gap-2">
                  {COMMON_SPORTS.map(s => {
                    const selected = quiz.profile.childhood_sports.includes(s)
                    return (
                      <motion.button
                        key={s}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => quiz.toggleSport(s)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          selected
                            ? 'bg-gold/15 border-gold/40 text-gold'
                            : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white/90 hover:border-white/25'
                        }`}
                      >
                        {s}
                      </motion.button>
                    )
                  })}
                  <button
                    disabled
                    className="px-4 py-2.5 rounded-xl border border-dashed border-white/10 text-white/30 text-sm font-medium cursor-not-allowed"
                    title="Coming soon"
                  >
                    + Other...
                  </button>
                </div>
                {quiz.profile.childhood_sports.length === 0 && (
                  <p className="mt-4 text-xs text-white/30">
                    Skip this if you didn't play sports — we'll match by other signals.
                  </p>
                )}
              </Step>
            )}

            {quiz.step === 'story' && (
              <Step
                heading="What kind of stories pull you in?"
                helper="Pick the one that resonates most."
              >
                <div className="space-y-3">
                  {STORY_OPTIONS.map(opt => {
                    const selected = quiz.profile.story_type === opt.value
                    return (
                      <motion.button
                        key={opt.value}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => quiz.setStoryType(opt.value)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selected
                            ? 'bg-gold/10 border-gold/40'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <h4 className={`font-semibold mb-1 ${selected ? 'text-gold' : 'text-white'}`}>
                          {opt.title}
                        </h4>
                        <p className="text-sm text-white/50">{opt.desc}</p>
                      </motion.button>
                    )
                  })}
                </div>
              </Step>
            )}

            {quiz.step === 'personality' && (
              <Step
                heading="What's your style?"
                helper="When you're into something, what does that look like?"
              >
                <div className="space-y-3">
                  {PERSONALITY_OPTIONS.map(opt => {
                    const selected = quiz.profile.personality === opt.value
                    return (
                      <motion.button
                        key={opt.value}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => quiz.setPersonality(opt.value)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selected
                            ? 'bg-gold/10 border-gold/40'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <h4 className={`font-semibold mb-1 ${selected ? 'text-gold' : 'text-white'}`}>
                          {opt.title}
                        </h4>
                        <p className="text-sm text-white/50">{opt.desc}</p>
                      </motion.button>
                    )
                  })}
                </div>
              </Step>
            )}

            {/* Nav row */}
            <div className="flex items-center justify-between mt-8">
              {quiz.stepIndex > 0 ? (
                <button
                  onClick={quiz.back}
                  className="text-white/40 hover:text-white/80 text-sm transition-colors"
                >
                  ← Back
                </button>
              ) : <div />}

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={quiz.next}
                disabled={!quiz.canProceed}
                className="px-7 py-2.5 rounded-xl font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
                  color: '#000',
                }}
              >
                {quiz.step === 'personality' ? 'Find my matches →' : 'Continue →'}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}


// ── Sub-components ──────────────────────────────────────────────────────

function Step({ heading, helper, children }: { heading: string; helper?: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="font-display text-3xl md:text-4xl text-white leading-tight mb-2">
        {heading}
      </h2>
      {helper && <p className="text-white/40 text-sm mb-6">{helper}</p>}
      {children}
    </>
  )
}


interface CountryPickerProps {
  value: string
  query: string
  onQuery: (q: string) => void
  options: string[]
  onPick: (c: string) => void
  placeholder: string
}

function CountryPicker({ value, query, onQuery, options, onPick, placeholder }: CountryPickerProps) {
  return (
    <div>
      {value && !query && (
        <div className="mb-4 flex items-center gap-2">
          <div className="px-4 py-2.5 rounded-xl bg-gold/15 border border-gold/40 text-gold font-semibold">
            {value}
          </div>
          <button onClick={() => onQuery(' ')} className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Change
          </button>
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={e => onQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/25 text-base focus:outline-none focus:border-gold/40"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map(c => (
          <motion.button
            key={c}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(c)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
              value === c
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:border-white/30'
            }`}
          >
            {c}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
