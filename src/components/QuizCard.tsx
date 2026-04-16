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
    return iso
  }
}

export function QuizCard({ quiz }: QuizCardProps) {
  const thumb = quiz.imageUrl
  const subtitle = `${quiz.totalQuestions} câu · ${quiz.score}/${quiz.totalQuestions} điểm`

  return (
    <Link
      to={`/saved/${quiz.id}`}
      className="flex gap-4 rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:shadow-lg"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl text-gray-400">📄</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold text-gray-900">{quiz.title}</h3>
        <p className="mt-1 text-sm text-gray-500">{formatDate(quiz.createdAt)}</p>
        <p className="mt-1 text-sm font-medium text-[#3B82F6]">{subtitle}</p>
      </div>
    </Link>
  )
}
