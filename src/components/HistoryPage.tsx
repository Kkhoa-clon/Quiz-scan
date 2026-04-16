import { Link } from 'react-router-dom'
import { QuizCard } from './QuizCard'
import { useQuizzes } from '../hooks/useQuizzes'

export function HistoryPage() {
  const { items, loading, error, refresh } = useQuizzes()

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Trang chủ"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lịch sử</h1>
          <p className="text-sm text-gray-500">Các bài đã lưu (file JSON trong data/quizzes)</p>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
          <button type="button" onClick={() => void refresh()} className="ml-2 underline">
            Thử lại
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Chưa có lịch sử.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((q) => (
            <li key={q.id}>
              <QuizCard quiz={q} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
