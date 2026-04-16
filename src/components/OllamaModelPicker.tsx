import { useEffect, useState } from 'react'
import { fetchOllamaModelNames } from '../lib/ollamaClient'
import { readOllamaPrefs, writeOllamaPrefs } from '../lib/ollamaPrefs'

interface OllamaModelPickerProps {
  model: string
  onModelChange: (m: string) => void
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  refineEnabled: boolean
  onRefineEnabledChange: (v: boolean) => void
  aiStructureEnabled: boolean
  onAiStructureEnabledChange: (v: boolean) => void
}

function selectClass(disabled: boolean) {
  return `w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 ${disabled ? 'opacity-50' : ''}`
}

export function OllamaModelPicker({
  model,
  onModelChange,
  enabled,
  onEnabledChange,
  refineEnabled,
  onRefineEnabledChange,
  aiStructureEnabled,
  onAiStructureEnabledChange,
}: OllamaModelPickerProps) {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load(opts: { syncSelection: boolean }) {
    setLoading(true)
    setErr(null)
    try {
      const names = await fetchOllamaModelNames()
      setModels(names)

      if (opts.syncSelection) {
        if (names.length === 0) {
          onModelChange('')
        } else {
          const saved = readOllamaPrefs().model
          onModelChange(saved && names.includes(saved) ? saved : names[0]!)
        }
      }
    } catch (e) {
      setModels([])
      setErr(e instanceof Error ? e.message : 'Không tải được danh sách model')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ syncSelection: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    writeOllamaPrefs(model, enabled, refineEnabled, aiStructureEnabled)
  }, [model, enabled, refineEnabled, aiStructureEnabled])

  const hasModels = models.length > 0
  const textTaskOn = refineEnabled || enabled || aiStructureEnabled
  const modelSelectDisabled = loading || models.length === 0

  return (
    <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Ollama</h2>
        <button
          type="button"
          onClick={() => void load({ syncSelection: false })}
          className="text-xs font-medium text-[#3B82F6] hover:underline"
          disabled={loading}
        >
          {loading ? 'Đang tải…' : 'Làm mới model'}
        </button>
      </div>

      {err ? (
        <p className="mt-2 text-xs text-amber-800" role="alert">
          {err}
        </p>
      ) : null}

      {!hasModels && !loading ? (
        <p className="mt-2 text-xs text-amber-800">
          Chưa có model. Ví dụ:{' '}
          <code className="rounded bg-amber-100 px-1">ollama pull qwen2.5-vl</code>
        </p>
      ) : null}

      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-700">Xử lý chữ</p>
        <div>
          <label htmlFor="ollama-text-model" className="mb-1 block text-xs font-medium text-gray-600">
            Model chữ
          </label>
          <select
            id="ollama-text-model"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={modelSelectDisabled}
            className={selectClass(modelSelectDisabled)}
          >
            {models.length === 0 ? (
              <option value="">—</option>
            ) : (
              models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))
            )}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={refineEnabled}
            onChange={(e) => onRefineEnabledChange(e.target.checked)}
            disabled={!hasModels || loading}
            className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] disabled:opacity-50"
          />
          Chuẩn hóa văn bản
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={aiStructureEnabled}
            onChange={(e) => onAiStructureEnabledChange(e.target.checked)}
            disabled={!hasModels || loading}
            className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] disabled:opacity-50"
          />
          AI tách từng câu &amp;
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            disabled={!hasModels || loading}
            className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] disabled:opacity-50"
          />
          Chấm đáp án + giải thích
        </label>

        {textTaskOn && !model.trim() ? (
          <p className="text-xs text-amber-800">Chọn model chữ ở trên.</p>
        ) : null}
      </div>
    </div>
  )
}
