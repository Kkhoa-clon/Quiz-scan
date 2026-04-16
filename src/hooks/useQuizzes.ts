import { useCallback, useEffect, useState } from 'react'
import { listQuizzes } from '../lib/quizStorage'
import type { QuizDoc } from '../lib/types'

export function useQuizzes() {
  const [items, setItems] = useState<QuizDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listQuizzes()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { items, loading, error, refresh }
}
