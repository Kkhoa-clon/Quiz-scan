import { useNavigate } from 'react-router-dom'
import { QuestionCard } from './QuestionCard'
import { useQuizFlow } from '../hooks/useQuizFlow'
import { saveQuiz } from '../lib/quizStorage'
import type { OptionKey } from '../lib/types'

export function ResultScreen() {
  const navigate = useNavigate()
  const {
    quiz,
    imageDataUrl,
    showExplanations,
    setShowExplanations,
    retryFromStart,
    resetSession,
  } = useQuizFlow()

  if (!quiz) return null

  const pct = quiz.totalQuestions
    ? Math.round((quiz.score / quiz.totalQuestions) * 100)
    : 0

  const handleSaveExit = async () => {
    try {
      await saveQuiz(quiz, imageDataUrl)
    } catch {
      // vẫn thoát; có thể báo lỗi sau
    }
    resetSession()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6 fade-in-up">
      <div className="relative overflow-hidden card bg-gradient-to-br from-slate-50 to-white p-6 text-center shadow-soft">
        <div className="pointer-events-none absolute -top-6 right-4 h-36 w-36 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <p className="text-sm font-medium text-slate-600">Kết quả</p>
        <p className="mt-2 text-5xl font-bold text-[#3B82F6]">{pct}%</p>
        <p className="mt-2 text-lg text-slate-800">
          <span className="font-semibold text-emerald-600">{quiz.score}</span> câu đúng / {quiz.totalQuestions} câu
        </p>
        <h2 className="mt-4 line-clamp-2 text-base font-semibold text-slate-950">{quiz.title}</h2>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => {
            retryFromStart()
            navigate('/play', { replace: true })
          }}
          className="flex-1 rounded-2xl border-2 border-[#3B82F6] py-3 text-center font-semibold text-[#3B82F6] hover:bg-[#3B82F6]/10"
        >
          Làm lại
        </button>
        <button
          type="button"
          onClick={() => setShowExplanations(!showExplanations)}
          className="flex-1 rounded-2xl bg-slate-100 py-3 text-center font-semibold text-slate-800 hover:bg-slate-200"
        >
          {showExplanations ? 'Ẩn giải chi tiết' : 'Xem giải chi tiết'}
        </button>
        <button
          type="button"
          onClick={handleSaveExit}
          className="flex-1 rounded-2xl bg-[#3B82F6] py-3 text-center font-semibold text-white shadow-sm hover:bg-[#2563EB]"
        >
          Lưu &amp; Thoát
        </button>
      </div>

      {showExplanations ? (
        <section className="mt-8 space-y-4">
          <h3 className="text-lg font-bold text-slate-950">Chi tiết từng câu</h3>
          {quiz.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              selected={(q.userAnswer as OptionKey | null) ?? null}
              onSelect={() => {}}
              disabled
              showSolution
            />
          ))}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          resetSession()
          navigate('/', { replace: true })
        }}
        className="mt-8 w-full text-center text-sm text-slate-500 hover:text-slate-800"
      >
        Về trang chủ
      </button>
    </div>
  )
}
