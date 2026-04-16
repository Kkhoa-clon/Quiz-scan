import { Navigate } from 'react-router-dom'
import { ResultScreen } from './ResultScreen'
import { useQuizFlow } from '../hooks/useQuizFlow'

export function ResultRoute() {
  const { phase, quiz } = useQuizFlow()
  if (phase !== 'result' || !quiz) {
    return <Navigate to="/" replace />
  }
  return <ResultScreen />
}
