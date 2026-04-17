import { useEffect, useRef, useState } from 'react'
import { analyzeQuizImage } from '../lib/analyzeQuizImage'
import type { ParsedQuizPayload } from '../lib/types'

interface ProcessingScreenProps {
  imageDataUrl: string
  /** Model Ollama cho chuẩn hóa văn / chấm (tên đã chọn). */
  ollamaModel?: string | null
  refineTextWithOllama?: boolean
  aiStructureExam?: boolean
  ollamaAnswerEnabled?: boolean
  usePreprocess?: boolean
  onDone: (payload: ParsedQuizPayload) => void
  onError: (message: string) => void
}

export function ProcessingScreen({
  imageDataUrl,
  ollamaModel = null,
  refineTextWithOllama = false,
  aiStructureExam = false,
  ollamaAnswerEnabled = false,
  usePreprocess = true,
  onDone,
  onError,
}: ProcessingScreenProps) {
  const [progress, setProgress] = useState(8)
  const [status, setStatus] = useState('Đang chuẩn bị…')
  const onDoneRef = useRef(onDone)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onDoneRef.current = onDone
    onErrorRef.current = onError
  }, [onDone, onError])

  useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((p) => (p < 95 ? p + 1 : p))
    }, 500)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setProgress(8)
        setStatus(usePreprocess ? 'Đang đọc ảnh + tách câu…' : 'Đang gửi ảnh trực tiếp tới OCR API…')
        const payload = await analyzeQuizImage(imageDataUrl, {
          ollamaModel: ollamaModel?.trim() || null,
          refineTextWithOllama: refineTextWithOllama,
          aiStructureExam: aiStructureExam,
          ollamaAnswerEnabled: ollamaAnswerEnabled,
          usePreprocess,
          onProgress: ({ message, percent }) => {
            if (!alive) return
            setStatus(message)
            if (percent != null) setProgress((prev) => Math.max(prev, Math.min(96, percent)))
          },
        })
        if (!alive) return
        setProgress(100)
        setStatus('Hoàn tất!')
        onDoneRef.current(payload)
      } catch (e) {
        if (!alive) return
        onErrorRef.current(e instanceof Error ? e.message : 'Lỗi không xác định')
      }
    })()
    return () => {
      alive = false
    }
  }, [
    imageDataUrl,
    ollamaModel,
    refineTextWithOllama,
    aiStructureExam,
    ollamaAnswerEnabled,
  ])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
      <div
        className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-[#3B82F6]"
        aria-hidden
      />
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-between text-sm text-slate-600">
          <span>{status}</span>
          <span>{Math.round(Math.min(progress, 100))}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#3B82F6] transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
