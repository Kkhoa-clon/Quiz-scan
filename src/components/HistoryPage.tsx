import { Link } from 'react-router-dom'
import { QuizCard } from './QuizCard'
import { useQuizzes } from '../hooks/useQuizzes'

export function HistoryPage() {
  const { items, loading, error, refresh } = useQuizzes()

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Trang chủ"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Lịch sử ({items.length})</h1>
          <p className="text-sm text-slate-500">Các bài đã lưu</p>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
          <button type="button" onClick={() => void refresh()} className="ml-2 underline">
            Thử lại
          </button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Chưa có bài kiểm tra nào. Tạo bài mới từ trang chủ.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <QuizCard key={q.id} quiz={q} />
          ))}
        </div>
      )}
      
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => void refresh()}
          className="btn-secondary flex-1"
        >
          Làm mới
        </button>
      </div>
    </div>
  )
}

