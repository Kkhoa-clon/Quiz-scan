import { Link } from 'react-router-dom'
import type { QuizDoc } from '../lib/types'

interface QuizCardProps {
  quiz: QuizDoc
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function QuizCard({ quiz }: QuizCardProps) {
  const thumb = quiz.imageUrl
  const subtitle = `${quiz.totalQuestions} câu · ${quiz.score}/${quiz.totalQuestions} điểm`

  return (
    <div className="group flex gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 transition duration-200 group-hover:scale-[1.03]">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl text-slate-400">📄</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold text-slate-950">{quiz.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{formatDate(quiz.createdAt)}</p>
        <p className="mt-1 text-sm font-medium text-[#3B82F6]">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2 ml-2">
        <Link
          to={`/saved/${quiz.id}`}
          className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 whitespace-nowrap"
        >
          Chơi
        </Link>
        <Link
          to={`/edit/${quiz.id}`}
          className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 whitespace-nowrap"
        >
          Sửa
        </Link>
      </div>
    </div>
  )
}

