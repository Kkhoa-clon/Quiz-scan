import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { OptionKey, ParsedQuizPayload, QuestionType, QuizDoc } from '../lib/types'
import { payloadToQuiz, saveQuiz } from '../lib/quizStorage'
import { QuizFlowContext, type QuizFlowState } from './quizFlowContext'

const initial: QuizFlowState = {
  phase: 'idle',
  quiz: null,
  imageDataUrl: null,
  answers: {},
  bookmarked: new Set(),
  showExplanations: false,
}

export function QuizFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuizFlowState>(initial)

  const loadCompletedQuiz = useCallback((quiz: QuizDoc) => {
    const answers: Record<number, OptionKey | null> = {}
    quiz.questions.forEach((q) => {
      answers[q.id] = (q.userAnswer as OptionKey | null) ?? null
    })
    setState({
      phase: 'result',
      quiz,
      imageDataUrl: quiz.imageUrl,
      answers,
      bookmarked: new Set(),
      showExplanations: false,
    })
  }, [])

  const startQuiz = useCallback(
    (payload: ParsedQuizPayload, imageDataUrl: string | null) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `q_${Date.now()}`
      const quiz = payloadToQuiz(payload, {
        id,
        userId: 'local',
        imageUrl: null,
      })
      const answers: Record<number, OptionKey | null> = {}
      quiz.questions.forEach((q) => {
        answers[q.id] = null
      })
      setState({
        phase: 'playing',
        quiz,
        imageDataUrl,
        answers,
        bookmarked: new Set(),
        showExplanations: false,
      })
      void saveQuiz(quiz, imageDataUrl).catch(() => {})
    },
    []
  )

  const setAnswer = useCallback((questionId: number, key: OptionKey | null) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [questionId]: key },
    }))
  }, [])

  const toggleBookmark = useCallback((questionId: number) => {
    setState((s) => {
      const next = new Set(s.bookmarked)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return { ...s, bookmarked: next }
    })
  }, [])

  const submitQuiz = useCallback(() => {
    setState((s) => {
      if (!s.quiz) return s
      let score = 0
      const questions: QuestionType[] = s.quiz.questions.map((q) => {
        const ua = s.answers[q.id] ?? null
        const ok = ua !== null && ua === q.correct
        if (ok) score += 1
        return {
          ...q,
          userAnswer: ua,
          isCorrect: ua !== null ? ok : false,
        }
      })
      const quiz: QuizDoc = {
        ...s.quiz,
        questions,
        score,
        totalQuestions: questions.length,
      }
      void saveQuiz(quiz, s.imageDataUrl ?? null).catch(() => {})
      return { ...s, phase: 'result', quiz, showExplanations: false }
    })
  }, [])

  const resetSession = useCallback(() => {
    setState(initial)
  }, [])

  const setShowExplanations = useCallback((v: boolean) => {
    setState((s) => ({ ...s, showExplanations: v }))
  }, [])

  const retryFromStart = useCallback(() => {
    setState((s) => {
      if (!s.quiz) return s
      const answers: Record<number, OptionKey | null> = {}
      s.quiz.questions.forEach((q) => {
        answers[q.id] = null
      })
      const questions: QuestionType[] = s.quiz.questions.map((q) => ({
        ...q,
        userAnswer: null,
        isCorrect: undefined,
      }))
      return {
        ...s,
        phase: 'playing',
        answers,
        bookmarked: new Set(),
        showExplanations: false,
        quiz: {
          ...s.quiz,
          questions,
          score: 0,
        },
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      startQuiz,
      loadCompletedQuiz,
      setAnswer,
      toggleBookmark,
      submitQuiz,
      resetSession,
      setShowExplanations,
      retryFromStart,
    }),
    [
      state,
      startQuiz,
      loadCompletedQuiz,
      setAnswer,
      toggleBookmark,
      submitQuiz,
      resetSession,
      setShowExplanations,
      retryFromStart,
    ]
  )

  return (
    <QuizFlowContext.Provider value={value}>{children}</QuizFlowContext.Provider>
  )
}
