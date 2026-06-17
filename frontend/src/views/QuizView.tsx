import { motion, AnimatePresence } from 'framer-motion'
import type { useQuiz } from '../hooks/useQuiz'
import ProgressBar from '../components/ProgressBar'
import OlympicRings from '../components/OlympicRings'

type QuizHook = ReturnType<typeof useQuiz>

const ARCHETYPE_COLORS = ['#FFD700', '#FF6B35', '#4ECDC4', '#FF4757', '#2ED573', '#A29BFE', '#FD79A8', '#FDCB6E', '#74B9FF', '#E17055', '#6C5CE7', '#00CEC9']

export default function QuizView({ quiz }: { quiz: QuizHook }) {
  if (quiz.isIntro) return <QuizIntro onStart={quiz.start} />
  if (!quiz.currentQuestion) return null

  const isMot = quiz.step < 4

  return (
    <motion.div
      key="quiz-active"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] flex flex-col items-center justify-center max-w-2xl mx-auto"
    >
      <div className="w-full">
        <ProgressBar progress={quiz.progress} total={7} current={quiz.step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={quiz.step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-8"
          >
            {/* Question */}
            <h2 className="font-display text-4xl md:text-5xl text-white leading-tight mb-8">
              {quiz.currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {quiz.currentQuestion.options.map((opt, i) => (
                <motion.button
                  key={opt.value}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ x: 6, borderColor: ARCHETYPE_COLORS[i * 3] }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => quiz.answerQuestion(opt.value)}
                  className="w-full text-left p-4 md:p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 group"
                >
                  <span className="text-sm md:text-base text-white/80 group-hover:text-white transition-colors leading-relaxed">
                    {opt.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Back */}
            {quiz.step > 0 && (
              <button
                onClick={quiz.goBack}
                className="mt-6 text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                ← Back
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function QuizIntro({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      key="quiz-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] flex flex-col items-center justify-center text-center max-w-xl mx-auto"
    >
      <OlympicRings size="md" />

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-6xl text-white mt-8 mb-3"
      >
        FIND YOUR MATCH
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/50 mb-2"
      >
        7 questions · 45 seconds · 1 Olympic athlete who matches your values
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/30 text-sm mb-10"
      >
        12 archetypes · 48 athletes · Paris 2024 & beyond
      </motion.p>

      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,215,0,0.35)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="px-12 py-4 rounded-2xl font-display text-2xl text-black"
        style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)' }}
      >
        START →
      </motion.button>
    </motion.div>
  )
}
