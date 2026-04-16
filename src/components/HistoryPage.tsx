import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QuizCard } from './QuizCard'
import { useQuizzes } from '../hooks/useQuizzes'

export function HistoryPage() {
  const { items, loading, error, refresh, deleteQuiz } = useQuizzes()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedCount = selectedIds.length

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    )
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map(q => q.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleDeleteSelected = async () => {
    if (!selectedCount) return
    if (!confirm(`Xóa ${selectedCount} bài kiểm tra? Không thể hoàn tác.`)) return
    try {
      await Promise.all(selectedIds.map(id => deleteQuiz(id)))
      setSelectedIds([])
      refresh()
    } catch (e) {
      alert('Lỗi xóa một số bài')
      refresh()
    }
  }

  const clearSelection = () => setSelectedIds([])

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>

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
          <h1 className="text-xl font-bold text-gray-900">Lịch sử ({items.length})</h1>
          <p className="text-sm text-gray-500">Các bài đã lưu</p>
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

      {selectedCount > 0 && (
        <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 border border-blue-200">
          <div className="flex items-center gap-3 text-sm">
            <input
              id="select-all"
              type="checkbox"
              checked={selectedCount === items.length}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              className="rounded border-blue-300 text-blue-600"
            />
            <label htmlFor="select-all" className="font-medium text-blue-900 cursor-pointer">
              Đã chọn {selectedCount}/{items.length}
            </label>
            <button
              onClick={handleDeleteSelected}
              className="ml-auto rounded-xl bg-red-500 px-3 py-1 text-white text-sm font-medium hover:bg-red-600"
            >
              Xóa {selectedCount}
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500">Chưa có bài kiểm tra nào. Tạo bài mới từ trang chủ.</p>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <label key={q.id} className="flex items-start gap-3 p-1 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedIds.includes(q.id)}
                onChange={(e) => toggleSelect(q.id, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <div className="flex-1">
                <QuizCard quiz={q} />
              </div>
            </label>
          ))}
        </div>
      )}
      
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => void refresh()}
          className="flex-1 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
        >
          Làm mới
        </button>
      </div>
    </div>
  )
}

