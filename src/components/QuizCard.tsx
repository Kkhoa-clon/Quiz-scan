import { Link } from 'react-router-dom'
import type { QuizDoc } from '../lib/types'
import { useQuizzes } from '../hooks/useQuizzes'

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
    <div className="group flex gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-lg transition-all">
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
      <div className="flex flex-col gap-2 ml-2">
        <Link
          to={`/saved/${quiz.id}`}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 whitespace-nowrap"
        >
          Chơi
        </Link>
        <Link
          to={`/edit/${quiz.id}`}
          className="px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 rounded-lg hover:bg-green-100 whitespace-nowrap"
        >
          Sửa
        </Link>
      </div>
    </div>
  )
}

