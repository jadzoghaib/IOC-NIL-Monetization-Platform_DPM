import { useState, useCallback } from 'react'

export type QuizStep = 'country' | 'current' | 'sports' | 'story' | 'personality' | 'done'
export type StoryType = 'underdog' | 'dominance' | 'culture' | 'mental_health'
export type Personality = 'hype' | 'grind' | 'mix'

export interface ConnectionProfile {
  country: string
  current_country: string
  childhood_sports: string[]
  story_type: StoryType | null
  personality: Personality | null
}

const STEPS: QuizStep[] = ['country', 'current', 'sports', 'story', 'personality', 'done']

const initialProfile: ConnectionProfile = {
  country: '',
  current_country: '',
  childhood_sports: [],
  story_type: null,
  personality: null,
}

export function useConnectionQuiz() {
  const [step, setStep] = useState<QuizStep>('country')
  const [profile, setProfile] = useState<ConnectionProfile>(initialProfile)

  const stepIndex = STEPS.indexOf(step)
  const total = STEPS.length - 1 // exclude 'done'
  const progress = stepIndex / total

  const next = useCallback(() => {
    setStep(s => {
      const i = STEPS.indexOf(s)
      return STEPS[Math.min(i + 1, STEPS.length - 1)]
    })
  }, [])

  const back = useCallback(() => {
    setStep(s => {
      const i = STEPS.indexOf(s)
      return STEPS[Math.max(i - 1, 0)]
    })
  }, [])

  const setCountry = (v: string) => setProfile(p => ({ ...p, country: v, current_country: p.current_country || v }))
  const setCurrent = (v: string) => setProfile(p => ({ ...p, current_country: v }))
  const toggleSport = (s: string) =>
    setProfile(p => ({
      ...p,
      childhood_sports: p.childhood_sports.includes(s)
        ? p.childhood_sports.filter(x => x !== s)
        : [...p.childhood_sports, s],
    }))
  const setStoryType = (v: StoryType) => setProfile(p => ({ ...p, story_type: v }))
  const setPersonality = (v: Personality) => setProfile(p => ({ ...p, personality: v }))

  const reset = () => { setProfile(initialProfile); setStep('country') }
  const skip = () => next()  // for optional steps

  const canProceed = (() => {
    switch (step) {
      case 'country':     return !!profile.country
      case 'current':     return true  // optional
      case 'sports':      return true  // can pick none
      case 'story':       return !!profile.story_type
      case 'personality': return !!profile.personality
      default:            return false
    }
  })()

  const isDone = step === 'done'

  return {
    step, profile, stepIndex, total, progress,
    next, back, skip, reset,
    setCountry, setCurrent, toggleSport, setStoryType, setPersonality,
    canProceed, isDone,
  }
}
