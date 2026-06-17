import { useState, useCallback } from 'react'
import type { Motivation, Engagement } from '../data/athletes'
import { MOTIVATION_QS, ENGAGEMENT_QS } from '../data/archetypes'

export type QuizStep = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

interface QuizState {
  step: number
  motScores: Record<Motivation, number>
  engScores: Record<Engagement, number>
  playerSeed: number
}

const fresh = (): QuizState => ({
  step: -1,
  motScores: { ambition: 0, unity: 0, inspiration: 0, legacy: 0 },
  engScores: { social: 0, competitive: 0, reflective: 0 },
  playerSeed: Math.floor(Math.random() * 1000),
})

export function useQuiz() {
  const [state, setState] = useState<QuizState>(fresh)

  const allQuestions = [...MOTIVATION_QS, ...ENGAGEMENT_QS]

  const currentQuestion = state.step >= 0 && state.step < 7
    ? allQuestions[state.step]
    : null

  const getArchetypeKey = useCallback((): [Motivation, Engagement] => {
    const mot = (Object.entries(state.motScores).sort((a, b) => b[1] - a[1])[0][0]) as Motivation
    const eng = (Object.entries(state.engScores).sort((a, b) => b[1] - a[1])[0][0]) as Engagement
    return [mot, eng]
  }, [state.motScores, state.engScores])

  const answerQuestion = useCallback((value: string) => {
    setState(prev => {
      const next = { ...prev }
      if (prev.step < 4) {
        next.motScores = { ...prev.motScores, [value]: (prev.motScores[value as Motivation] ?? 0) + 1 }
      } else {
        next.engScores = { ...prev.engScores, [value]: (prev.engScores[value as Engagement] ?? 0) + 1 }
      }
      next.step = prev.step + 1
      return next
    })
  }, [])

  const goBack = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(-1, prev.step - 1) }))
  }, [])

  const start = useCallback(() => setState(prev => ({ ...prev, step: 0 })), [])
  const reset = useCallback(() => setState(fresh()), [])

  return {
    step: state.step,
    playerSeed: state.playerSeed,
    currentQuestion,
    allQuestions,
    isIntro:    state.step === -1,
    isInProgress: state.step >= 0 && state.step < 7,
    isDone:     state.step >= 7,
    progress:   state.step >= 0 ? state.step / 7 : 0,
    getArchetypeKey,
    answerQuestion,
    goBack,
    start,
    reset,
  }
}
