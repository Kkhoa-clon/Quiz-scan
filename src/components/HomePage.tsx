import { Link } from 'react-router-dom'
import { QuizCard } from './QuizCard'
import { useQuizzes } from '../hooks/useQuizzes'

export function HomePage() {
  const { items, loading, error, refresh } = useQuizzes()

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <header className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">QuizScan AI</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Chụp đề trắc nghiệm → AI giải ngay → Xem kết quả chi tiết
        </p>
      </header>

      <nav className="mb-6 flex gap-4 text-sm font-medium">
        <span className="text-[#3B82F6]">Trang chủ</span>
        <Link to="/history" className="text-gray-500 hover:text-[#3B82F6]">
          Lịch sử
        </Link>
      </nav>

      {error ? (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
          <button type="button" onClick={() => void refresh()} className="ml-2 underline">
            Thử lại
          </button>
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Đề của bạn</h2>
      {loading ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500">
          Chưa có đề nào. Nhấn nút xanh bên dưới để quét đề đầu tiên.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((q) => (
            <li key={q.id}>
              <QuizCard quiz={q} />
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/scan"
        className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#3B82F6] px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-[#2563EB] md:left-auto md:right-8 md:translate-x-0"
      >
        <span className="text-xl leading-none">＋</span>
        Quét đề mới
      </Link>
    </div>
  )
}
