import { Navigate } from 'react-router-dom'
import { QuizPlayer } from './QuizPlayer'
import { useQuizFlow } from '../hooks/useQuizFlow'

export function PlayRoute() {
  const { phase, quiz } = useQuizFlow()
  if (phase !== 'playing' || !quiz) {
    return <Navigate to="/" replace />
  }
  return <QuizPlayer />
}
