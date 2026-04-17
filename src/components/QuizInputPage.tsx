import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OllamaModelPicker } from './OllamaModelPicker'
import { readOllamaPrefs } from '../lib/ollamaPrefs'
import { useQuizFlow } from '../hooks/useQuizFlow'
import { extractTextFromFile } from '../lib/extractTextFromFile'
import { analyzeQuizText } from '../lib/analyzeQuizText'

const acceptedExtensions = ['doc', 'docx', 'pdf', 'txt']

export function QuizInputPage() {
  const navigate = useNavigate()
  const { startQuiz } = useQuizFlow()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rawText, setRawText] = useState('')
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file')
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('Sẵn sàng')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [ollamaModel, setOllamaModel] = useState(() => readOllamaPrefs().model)
  const [ollamaEnabled, setOllamaEnabled] = useState(() => readOllamaPrefs().enabled)
  const [refineEnabled, setRefineEnabled] = useState(() => readOllamaPrefs().refineEnabled)
  const [aiStructureEnabled, setAiStructureEnabled] = useState(
    () => readOllamaPrefs().aiStructureEnabled
  )

  const fileLabel = useMemo(
    () => (selectedFile ? selectedFile.name : 'Chưa chọn file'),
    [selectedFile]
  )

  const handleFileSelection = useCallback((file: File | null) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !acceptedExtensions.includes(ext)) {
      setError('Chỉ hỗ trợ .doc .docx .pdf .txt')
      return
    }
    setError(null)
    setSelectedFile(file)
  }, [])

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null
      handleFileSelection(file)
    },
    [handleFileSelection]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragging(false)
      const file = event.dataTransfer.files?.[0] ?? null
      handleFileSelection(file)
    },
    [handleFileSelection]
  )

  const handleProcess = useCallback(async () => {
    setError(null)
    setStatus('Đang chuẩn bị…')
    setProgress(6)
    setIsProcessing(true)

    try {
      let text = ''
      if (inputMode === 'paste') {
        text = rawText.trim()
        if (!text) {
          throw new Error('Chưa có nội dung đề. Dán nội dung đề để tiếp tục.')
        }
      } else {
        if (!selectedFile) {
          throw new Error('Chưa có file. Tải file đề lên để tiếp tục.')
        }
        setStatus('Đang trích xuất văn bản từ file…')
        setProgress(18)
        text = await extractTextFromFile(selectedFile)
      }

      if (!text.trim()) {
        throw new Error('Không thu được văn bản hợp lệ. Thử file khác hoặc dán nội dung trực tiếp.')
      }

      setStatus('Đang xử lý đề…')
      setProgress(30)

      const payload = await analyzeQuizText(text, {
        ollamaModel: ollamaModel?.trim() || null,
        refineTextWithOllama: refineEnabled,
        aiStructureExam: aiStructureEnabled,
        ollamaAnswerEnabled: ollamaEnabled,
        onProgress: ({ message, percent }) => {
          setStatus(message)
          if (percent != null) {
            setProgress(Math.min(100, Math.max(0, percent)))
          }
        },
      })

      setProgress(100)
      setStatus('Hoàn tất — chuyển sang làm bài…')
      startQuiz(payload, null)
      navigate('/play', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
      setStatus('Đã xảy ra lỗi')
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }, [inputMode, rawText, selectedFile, ollamaModel, refineEnabled, aiStructureEnabled, ollamaEnabled, navigate, startQuiz])

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 fade-in-up">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Quay lại"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Nhập đề trắc nghiệm</h1>
          <p className="text-sm text-slate-500">Tải file đề hoặc dán văn bản rồi xử lý ngay.</p>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="card p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Nhập đề trắc nghiệm</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Chọn cách nhập đề: tải file hoặc dán trực tiếp.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    inputMode === 'file'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Tải file
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    inputMode === 'paste'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Dán văn bản
                </button>
              </div>
            </div>

            {inputMode === 'file' ? (
              <div className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  className={`rounded-[32px] border p-4 text-sm transition duration-200 ${
                    dragging ? 'border-[#3B82F6]/40 bg-[#EFF6FF] shadow-soft' : 'border-dashed border-slate-300 bg-slate-50'
                  }`}
                >
                  <p className="text-slate-700">Kéo thả file vào đây hoặc chọn file bằng nút bên dưới.</p>
                  <p className="mt-2 text-xs text-slate-500">File hiện tại: {fileLabel}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 btn-primary"
                    disabled={isProcessing}
                  >
                    Chọn file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedExtensions.map((ext) => `.${ext}`).join(',')}
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label htmlFor="quiz-text" className="mb-2 block text-sm font-semibold text-slate-950">
                  Dán đề trực tiếp
                </label>
                <textarea
                  id="quiz-text"
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  rows={12}
                  className="input-field min-h-[260px]"
                  placeholder="Dán nội dung đề trắc nghiệm tại đây..."
                  disabled={isProcessing}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div />
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing || (inputMode === 'file' ? !selectedFile : !rawText.trim())}
              className="btn-primary disabled:bg-slate-300 disabled:text-slate-700 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Đang xử lý...' : 'Xử lý ngay'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Trạng thái</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#3B82F6] transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-slate-700">{status}</p>
          </div>
        </div>

        <div className="card p-6">
          <OllamaModelPicker
            model={ollamaModel}
            onModelChange={setOllamaModel}
            enabled={ollamaEnabled}
            onEnabledChange={setOllamaEnabled}
            refineEnabled={refineEnabled}
            onRefineEnabledChange={setRefineEnabled}
            aiStructureEnabled={aiStructureEnabled}
            onAiStructureEnabledChange={setAiStructureEnabled}
          />
        </div>
      </div>
    </div>
  )
}
