import {
  enrichPayloadWithOllama,
  refineExamTextWithOllama,
  structureExamWithOllama,
} from './ollamaClient'
import { parseExamTextToQuiz } from './parseExamFromOcr'
import type { ParsedQuizPayload } from './types'

export type AnalyzeProgress = (info: {
  phase: 'refine' | 'structure' | 'parse' | 'ollama'
  message: string
  percent?: number
}) => void

export type AnalyzeQuizTextOptions = {
  onProgress?: AnalyzeProgress
  ollamaModel?: string | null
  refineTextWithOllama?: boolean
  ollamaAnswerEnabled?: boolean
  aiStructureExam?: boolean
}

export async function analyzeQuizText(
  rawText: string,
  options?: AnalyzeQuizTextOptions
): Promise<ParsedQuizPayload> {
  const onProgress = options?.onProgress
  let examText = rawText.trim()

  if (!examText) {
    throw new Error('Không có văn bản đề để xử lý.')
  }

  const textModel = options?.ollamaModel?.trim() || ''
  const refineModel = options?.refineTextWithOllama && textModel ? textModel : ''

  if (refineModel) {
    onProgress?.({ phase: 'refine', message: `Đang chuẩn hóa văn bản (${refineModel})…`, percent: 12 })
    try {
      examText = await refineExamTextWithOllama(refineModel, examText)
      onProgress?.({ phase: 'refine', message: 'Chuẩn hóa xong — chuyển sang tách câu…', percent: 22 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      onProgress?.({
        phase: 'refine',
        message: `Chuẩn hóa lỗi (${msg.slice(0, 55)}…) — dùng văn bản gốc`,
        percent: 18,
      })
    }
  }

  let payload: ParsedQuizPayload
  if (textModel && options?.aiStructureExam) {
    onProgress?.({ phase: 'structure', message: `AI đang phân tách câu (${textModel})…`, percent: 30 })
    try {
      payload = await structureExamWithOllama(textModel, examText, {
        onSlice: (message) => onProgress?.({ phase: 'structure', message, percent: 40 }),
      })
      onProgress?.({ phase: 'parse', message: `Đã tách ${payload.questions.length} câu bằng AI`, percent: 52 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      onProgress?.({
        phase: 'structure',
        message: `AI tách câu lỗi (${msg.slice(0, 55)}…) — dùng regex`,
        percent: 34,
      })
      payload = parseExamTextToQuiz(examText)
      onProgress?.({ phase: 'parse', message: `Đã tách ${payload.questions.length} câu bằng regex`, percent: 52 })
    }
  } else {
    onProgress?.({ phase: 'parse', message: 'Đang tách câu bằng regex…', percent: 30 })
    payload = parseExamTextToQuiz(examText)
    onProgress?.({ phase: 'parse', message: `Đã tách ${payload.questions.length} câu`, percent: 52 })
  }

  if (options?.ollamaAnswerEnabled && textModel) {
    onProgress?.({ phase: 'ollama', message: `Đang chấm đáp án (${textModel})…`, percent: 55 })
    payload = await enrichPayloadWithOllama(textModel, payload, (message, percent) => {
      onProgress?.({ phase: 'ollama', message, percent: Math.max(55, percent ?? 68) })
    })
    onProgress?.({ phase: 'ollama', message: 'Ollama xong', percent: 92 })
  }

  return payload
}
