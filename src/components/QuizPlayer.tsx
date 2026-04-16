import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuestionCard } from './QuestionCard'
import { useQuizFlow } from '../hooks/useQuizFlow'
import type { OptionKey } from '../lib/types'

export function QuizPlayer() {
  const navigate = useNavigate()
  const {
    quiz,
    answers,
    setAnswer,
    bookmarked,
    toggleBookmark,
    submitQuiz,
  } = useQuizFlow()
  const [index, setIndex] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(45 * 60)

  const questions = quiz?.questions ?? []
  const current = questions[index]
  const total = questions.length

  useEffect(() => {
    if (!timerOn) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [timerOn])

  useEffect(() => {
    if (!timerOn || secondsLeft > 0 || !quiz) return
    submitQuiz()
    navigate('/result', { replace: true })
  }, [timerOn, secondsLeft, quiz, submitQuiz, navigate])

  const progress = useMemo(() => {
    if (!total) return 0
    return Math.round(((index + 1) / total) * 100)
  }, [index, total])

  if (!quiz || !current) return null

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={() => {
            setTimerOn((t) => {
              if (!t) setSecondsLeft(45 * 60)
              return !t
            })
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            timerOn ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {timerOn ? `⏱ ${fmt(secondsLeft)}` : 'Bật timer 45p'}
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
        <span className="font-medium text-[#3B82F6]">
          Câu {index + 1}/{total}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#3B82F6] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <QuestionCard
        question={current}
        selected={answers[current.id] ?? null}
        onSelect={(k: OptionKey) => setAnswer(current.id, k)}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-40"
        >
          Trước
        </button>
        <button
          type="button"
          onClick={() => toggleBookmark(current.id)}
          className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
            bookmarked.has(current.id)
              ? 'bg-amber-100 text-amber-900'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {bookmarked.has(current.id) ? '★ Đánh dấu' : '☆ Đánh dấu'}
        </button>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          className="rounded-2xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2563EB] disabled:opacity-40"
        >
          Sau
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => {
              submitQuiz()
              navigate('/result', { replace: true })
            }}
            className="w-full rounded-2xl bg-[#3B82F6] py-3.5 text-center font-semibold text-white shadow-md hover:bg-[#2563EB]"
          >
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  )
}
