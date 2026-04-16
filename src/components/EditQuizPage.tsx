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

  // Editable state
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
        setQuestions([...q.questions]) // Copy for editing
      } catch (e) {
        setError('Lỗi tải bài')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, navigate])

  const updateQuestion = useCallback((qIndex: number, field: keyof QuestionType, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === qIndex ? { ...q, [field]: value } : q
    ))
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
    setQuestions(prev => [...prev, newQ])
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

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <header className="mb-8 flex items-center gap-4">
        <Link to="/history" className="rounded-full p-3 text-gray-600 hover:bg-gray-100" aria-label="Lịch sử">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa bài kiểm tra</h1>
          <p className="text-gray-500">Sửa lỗi AI, thêm câu hỏi</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Nhập tiêu đề đề thi"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Câu hỏi ({questions.length})</h2>
            <button
              onClick={addQuestion}
              className="rounded-xl bg-green-500 px-4 py-2 text-white font-medium hover:bg-green-600"
            >
              + Thêm câu
            </button>
          </div>
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="border border-gray-200 rounded-2xl p-6 bg-white hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-gray-900">Câu {q.id}</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Câu hỏi</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 p-3 focus:border-blue-500 focus:ring-1"
                      placeholder="Nhập nội dung câu hỏi"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as OptionKey[]).map(opt => (
                      <div key={opt}>
                        <label className="block text-xs font-medium mb-1">{opt}</label>
                        <input
                          value={q.options[opt]}
                          onChange={(e) => updateQuestion(index, 'options', {
                            ...q.options,
                            [opt]: e.target.value
                          })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500"
                          placeholder={`Đáp án ${opt}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Đáp án đúng:</label>
                    <select
                      value={q.correct}
                      onChange={(e) => updateQuestion(index, 'correct', e.target.value as OptionKey)}
                      className="rounded-xl border border-gray-200 px-3 py-2 focus:border-blue-500"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Giải thích (tùy chọn)</label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 p-3 focus:border-blue-500"
                      placeholder="Giải thích đáp án đúng..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 rounded-2xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button
            onClick={handlePlay}
            disabled={!questions.length}
            className="flex-1 rounded-2xl bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            Chơi bài (preview)
          </button>
        </div>
      </div>
    </div>
  )
}

