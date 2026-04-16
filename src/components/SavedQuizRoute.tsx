import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuizFlow } from '../hooks/useQuizFlow'
import { getQuizById } from '../lib/quizStorage'

export function SavedQuizRoute() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loadCompletedQuiz } = useQuizFlow()
  const [msg, setMsg] = useState('Đang tải bài…')

  useEffect(() => {
    if (!id) {
      navigate('/', { replace: true })
      return
    }
    let alive = true
    ;(async () => {
      const q = await getQuizById(id)
      if (!alive) return
      if (!q) {
        setMsg('Không tìm thấy bài.')
        window.setTimeout(() => navigate('/', { replace: true }), 1200)
        return
      }
      loadCompletedQuiz(q)
      navigate('/result', { replace: true })
    })()
    return () => {
      alive = false
    }
  }, [id, navigate, loadCompletedQuiz])

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-gray-600">{msg}</div>
  )
}
