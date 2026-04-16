import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraComponent } from './CameraComponent'
import { OllamaModelPicker } from './OllamaModelPicker'
import { readOllamaPrefs } from '../lib/ollamaPrefs'
import { ProcessingScreen } from './ProcessingScreen'
import { useQuizFlow } from '../hooks/useQuizFlow'
import type { ParsedQuizPayload } from '../lib/types'

type Step = 'camera' | 'processing'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Không đọc được file'))
    r.readAsDataURL(file)
  })
}

export function ScanPage() {
  const navigate = useNavigate()
  const { startQuiz } = useQuizFlow()
  const [step, setStep] = useState<Step>('camera')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ollamaModel, setOllamaModel] = useState(() => readOllamaPrefs().model)
  const [ollamaEnabled, setOllamaEnabled] = useState(() => readOllamaPrefs().enabled)
  const [refineEnabled, setRefineEnabled] = useState(() => readOllamaPrefs().refineEnabled)
  const [aiStructureEnabled, setAiStructureEnabled] = useState(
    () => readOllamaPrefs().aiStructureEnabled
  )
  const [preprocessEnabled, setPreprocessEnabled] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleCapture = useCallback((dataUrl: string) => {
    setErr(null)
    setImageDataUrl(dataUrl)
    setStep('processing')
  }, [])

  const handleFiles = useCallback(async (files: FileList) => {
    setErr(null)
    const first = files[0]
    if (!first) return
    try {
      const url = await fileToDataUrl(first)
      setImageDataUrl(url)
      setStep('processing')
    } catch {
      setErr('Không đọc được ảnh. Thử ảnh khác.')
    }
  }, [])

  const handleDone = useCallback(
    (payload: ParsedQuizPayload) => {
      if (!imageDataUrl) return
      startQuiz(payload, imageDataUrl)
      navigate('/play', { replace: true })
    },
    [imageDataUrl, navigate, startQuiz]
  )

  const handleError = useCallback((message: string) => {
    setErr(message)
    setStep('camera')
    setImageDataUrl(null)
  }, [])

  const back = () => {
    setErr(null)
    setStep('camera')
    setImageDataUrl(null)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Quay lại"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quét đề mới</h1>
          <p className="text-sm text-gray-500">Chụp hoặc tải ảnh đề trắc nghiệm</p>
        </div>
      </header>

      {err ? (
        <div
          className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {err}
        </div>
      ) : null}

      {step === 'camera' ? (
        <>
          <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Cài đặt</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Ẩn bớt tùy chọn nâng cao để giao diện gọn hơn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced((value) => !value)}
                className="text-xs font-medium text-[#3B82F6] hover:underline"
              >
                {showAdvanced ? 'Thu gọn' : 'Tùy chọn nâng cao'}
              </button>
            </div>

            <label className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
              <span>Tiền xử lý ảnh trước khi gửi OCR</span>
              <input
                type="checkbox"
                checked={preprocessEnabled}
                onChange={(e) => setPreprocessEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#3B82F6]"
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              Tắt nếu bạn muốn OCR API xử lý ảnh trực tiếp mà không cần tiền xử lý phụ.
            </p>
          </div>

          {showAdvanced ? (
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
          ) : null}

          <CameraComponent onCapture={handleCapture} onFiles={handleFiles} />
        </>
      ) : imageDataUrl ? (
        <div>
          <button
            type="button"
            onClick={back}
            className="mb-4 text-sm font-medium text-[#3B82F6] hover:underline"
          >
            ← Chọn ảnh khác
          </button>
          <ProcessingScreen
            imageDataUrl={imageDataUrl}
            ollamaModel={ollamaModel.trim() || null}
            refineTextWithOllama={refineEnabled}
            aiStructureExam={aiStructureEnabled}
            ollamaAnswerEnabled={ollamaEnabled}
            usePreprocess={preprocessEnabled}
            onDone={handleDone}
            onError={handleError}
          />
        </div>
      ) : null}
    </div>
  )
}
