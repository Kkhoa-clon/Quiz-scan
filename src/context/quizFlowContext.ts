import { createContext } from 'react'
import type { OptionKey, ParsedQuizPayload, QuizDoc } from '../lib/types'

export type FlowPhase = 'idle' | 'playing' | 'result'

export interface QuizFlowState {
  phase: FlowPhase
  quiz: QuizDoc | null
  imageDataUrl: string | null
  answers: Record<number, OptionKey | null>
  bookmarked: Set<number>
  showExplanations: boolean
}

export interface QuizFlowContextValue extends QuizFlowState {
  startQuiz: (payload: ParsedQuizPayload, imageDataUrl: string | null) => void
  loadCompletedQuiz: (quiz: QuizDoc) => void
  setAnswer: (questionId: number, key: OptionKey | null) => void
  toggleBookmark: (questionId: number) => void
  submitQuiz: () => void
  resetSession: () => void
  setShowExplanations: (v: boolean) => void
  retryFromStart: () => void
}

export const QuizFlowContext = createContext<QuizFlowContextValue | null>(null)
