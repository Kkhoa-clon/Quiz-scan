import { Link } from 'react-router-dom'
import { QuizCard } from './QuizCard'
import { useQuizzes } from '../hooks/useQuizzes'

export function HomePage() {
  const { items, loading, error, refresh } = useQuizzes()

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-8 fade-in-up">
      <header className="mb-6 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
              MindScan AI
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Giải đề trắc nghiệm nhanh chóng</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Chụp đề trắc nghiệm → AI phân tích đề &amp; chấm điểm → Xem kết quả chi tiết.
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-medium text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[#3B82F6]">Trang chủ</span>
            <Link to="/history" className="rounded-full px-3 py-1 hover:text-[#3B82F6]">
              Lịch sử
            </Link>
          </nav>
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

      <section className="space-y-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Đề của bạn</h2>
              <p className="mt-1 text-sm text-slate-500">Quản lý đề đã quét và tiếp tục làm bài nhanh chóng.</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="btn-secondary"
            >
              Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            Đang tải…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
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
      </section>

      <Link
        to="/scan"
        className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-6 py-4 text-base font-semibold text-white shadow-soft transition hover:opacity-95 md:left-auto md:right-8 md:translate-x-0"
      >
        <span className="text-xl leading-none">＋</span>
        Quét đề mới
      </Link>
    </div>
  )
}
