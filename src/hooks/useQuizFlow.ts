import { useContext } from 'react'
import { QuizFlowContext } from '../context/quizFlowContext'

export function useQuizFlow() {
  const ctx = useContext(QuizFlowContext)
  if (!ctx) throw new Error('useQuizFlow must be used within QuizFlowProvider')
  return ctx
}
