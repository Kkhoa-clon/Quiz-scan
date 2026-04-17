import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuizFlow } from '../hooks/useQuizFlow'
import { getQuizById, updateQuiz } from '../lib/quizStorage'
import type { QuizDoc, OptionKey, QuestionType } from '../lib/types'
import { Link } from 'react-router-dom'

export function EditQuizPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loadCompletedQuiz } = useQuizFlow()
  const [quiz, setQuiz] = useState<QuizDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<QuestionType[]>([])

  useEffect(() => {
    if (!id) {
      navigate('/history', { replace: true })
      return
    }
    ;(async () => {
      try {
        const q = await getQuizById(id)
        if (!q) {
          setError('Không tìm thấy bài kiểm tra')
          return
        }
        setQuiz(q)
        setTitle(q.title)
        setQuestions([...q.questions])
      } catch (e) {
        setError('Lỗi tải bài')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, navigate])

  const updateQuestion = useCallback((qIndex: number, field: keyof QuestionType, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, [field]: value } : q))
    )
  }, [])

  const addQuestion = useCallback(() => {
    const newQ: QuestionType = {
      id: questions.length + 1,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correct: 'A',
      explanation: '',
      userAnswer: null,
      isCorrect: undefined,
    }
    setQuestions((prev) => [...prev, newQ])
  }, [questions.length])

  const handleSave = useCallback(async () => {
    if (!id || !quiz) return
    if (!title.trim()) {
      setError('Nhập tiêu đề')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updatedQuiz: QuizDoc = {
        ...quiz,
        title,
        questions,
      }
      await updateQuiz(id, updatedQuiz)
      alert('Đã lưu thành công!')
      navigate(`/saved/${id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu')
    } finally {
      setSaving(false)
    }
  }, [id, quiz, title, questions, navigate])

  const handlePlay = useCallback(() => {
    if (quiz && questions.length) {
      loadCompletedQuiz({ ...quiz, title, questions, score: 0 })
      navigate('/play', { replace: true })
    }
  }, [quiz, questions, title, navigate, loadCompletedQuiz])

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 fade-in-up">
      <header className="mb-8 flex items-center gap-4">
        <Link to="/history" className="rounded-full p-3 text-slate-600 hover:bg-slate-100" aria-label="Lịch sử">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Chỉnh sửa bài kiểm tra</h1>
          <p className="text-slate-500">Sửa lỗi AI, thêm câu hỏi</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-950 mb-2">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field text-lg"
            placeholder="Nhập tiêu đề đề thi"
          />
        </div>

        <div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Câu hỏi ({questions.length})</h2>
            <button
              onClick={addQuestion}
              className="btn-primary"
            >
              + Thêm câu
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="card p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft">
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h3 className="font-semibold text-slate-950">Câu {q.id}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-900">Câu hỏi</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      rows={3}
                      className="input-field"
                      placeholder="Nhập nội dung câu hỏi"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as OptionKey[]).map((opt) => (
                      <div key={opt}>
                        <label className="block text-xs font-medium mb-1 text-slate-700">{opt}</label>
                        <input
                          value={q.options[opt]}
                          onChange={(e) => updateQuestion(index, 'options', {
                            ...q.options,
                            [opt]: e.target.value,
                          })}
                          className="input-field"
                          placeholder={`Đáp án ${opt}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="text-sm font-medium text-slate-900">Đáp án đúng:</label>
                    <select
                      value={q.correct}
                      onChange={(e) => updateQuestion(index, 'correct', e.target.value as OptionKey)}
                      className="input-field max-w-[180px]"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Giải thích (tùy chọn)</label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                      rows={2}
                      className="input-field"
                      placeholder="Giải thích đáp án đúng..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="btn-primary disabled:bg-slate-300 disabled:text-slate-700 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button
            onClick={handlePlay}
            disabled={!questions.length}
            className="btn-secondary disabled:opacity-50"
          >
            Chơi bài (preview)
          </button>
        </div>
      </div>
    </div>
  )
}

