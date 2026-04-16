import {
  enrichPayloadWithOllama,
  refineExamTextWithOllama,
  structureExamWithOllama,
} from './ollamaClient'
import { preprocessExamImage } from './imagePreprocess'
// Remove aistudioOcr import - now server-side
import { parseExamTextToQuiz } from './parseExamFromOcr'
import type { ParsedQuizPayload } from './types'

export type AnalyzeProgress = (info: {
  phase: 'ocr' | 'refine' | 'structure' | 'parse' | 'ollama'
  message: string
  percent?: number
}) => void

export type AnalyzeQuizOptions = {
  onProgress?: AnalyzeProgress
  /** Tên model Ollama cho chuẩn hóa văn / chấm (cùng model đã chọn trên UI). */
  ollamaModel?: string | null
  /** Chuẩn hóa văn bản sau OCR/Vision (sửa chính tả, format). */
  refineTextWithOllama?: boolean
  /** Chấm đáp án đúng + giải thích. */
  ollamaAnswerEnabled?: boolean
  /** AI tách từng câu + A–D (JSON); lỗi → regex. */
  aiStructureExam?: boolean
  /** Có dùng tiền xử lý ảnh local trước khi gửi OCR API không. */
  usePreprocess?: boolean
}

/**
 * Ảnh → văn bản → (tuỳ chọn) chuẩn hóa → AI tách câu trắc nghiệm hoặc regex → (tuỳ chọn) chấm.
 */
export async function analyzeQuizImage(
  imageDataUrl: string,
  options?: AnalyzeQuizOptions
): Promise<ParsedQuizPayload> {
  const onProgress = options?.onProgress
  const usePreprocess = options?.usePreprocess ?? true
  let inputForOcr = imageDataUrl

  // Convert to Blob for POST
  const imgBlob = await fetch(inputForOcr).then(r => r.blob());

  if (usePreprocess) {
    onProgress?.({
      phase: 'ocr',
      message: 'Tiền xử lý ảnh…',
      percent: 6,
    })
    inputForOcr = await preprocessExamImage(imageDataUrl, { mode: 'ocr' });
  }

  onProgress?.({
    phase: 'ocr',
    message: 'Gửi ảnh tới server OCR…',
    percent: 18,
  })

  const formData = new FormData();
  formData.append('image', imgBlob, 'exam.jpg');

  const ocrRes = await fetch('/api/ocr/extract', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer quizscan-local-token-change-in-prod', // match server
    },
    body: formData,
  });

  if (!ocrRes.ok) {
    throw new Error(`Server OCR failed: ${ocrRes.status}`);
  }
  let examText = (await ocrRes.json()).examText;

  onProgress?.({
    phase: 'ocr',
    message: 'OCR hoàn tất',
    percent: 82,
  })

  const textModel = options?.ollamaModel?.trim() || ''
  const refineModel = options?.refineTextWithOllama && textModel ? textModel : ''
  if (refineModel) {
    onProgress?.({
      phase: 'refine',
      message: `Đang chuẩn hóa văn bản (${refineModel})…`,
      percent: 84,
    })
    try {
      examText = await refineExamTextWithOllama(refineModel, examText)
      onProgress?.({ phase: 'refine', message: 'Chuẩn hóa xong — tách câu…', percent: 87 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      onProgress?.({
        phase: 'refine',
        message: `Chuẩn hóa lỗi (${msg.slice(0, 60)}…) — dùng bản gốc`,
        percent: 86,
      })
    }
  }

  let payload: ParsedQuizPayload
  if (textModel && options?.aiStructureExam) {
    onProgress?.({
      phase: 'structure',
      message: `AI đang phân tách từng câu trắc nghiệm (${textModel})…`,
      percent: 87,
    })
    try {
      payload = await structureExamWithOllama(textModel, examText, {
        onSlice: (msg) =>
          onProgress?.({ phase: 'structure', message: msg, percent: 87 }),
      })
      onProgress?.({
        phase: 'parse',
        message: `Đã tách ${payload.questions.length} câu (AI)`,
        percent: 90,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      onProgress?.({
        phase: 'structure',
        message: `AI tách câu lỗi (${msg.slice(0, 55)}…) — dùng regex`,
        percent: 88,
      })
      payload = parseExamTextToQuiz(examText)
      onProgress?.({
        phase: 'parse',
        message: `Đã tách ${payload.questions.length} câu (regex)`,
        percent: 90,
      })
    }
  } else {
    onProgress?.({ phase: 'parse', message: 'Đang tách câu (regex)…', percent: 88 })
    payload = parseExamTextToQuiz(examText)
    onProgress?.({
      phase: 'parse',
      message: `Đã tách ${payload.questions.length} câu`,
      percent: 90,
    })
  }

  if (options?.ollamaAnswerEnabled && textModel) {
    onProgress?.({
      phase: 'ollama',
      message: `Đang chấm đáp án (${textModel})…`,
      percent: 91,
    })
    payload = await enrichPayloadWithOllama(textModel, payload, (msg, pct) => {
      onProgress?.({ phase: 'ollama', message: msg, percent: pct ?? 95 })
    })
    onProgress?.({ phase: 'ollama', message: 'Ollama xong', percent: 99 })
  }

  return payload
}
