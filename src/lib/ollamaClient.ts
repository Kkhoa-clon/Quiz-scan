import {
  numberSplitExamBlocks,
  parseExamTextToQuiz,
  roughSplitExamBlocks,
} from './parseExamFromOcr'
import type { OptionKey, ParsedQuizPayload, QuestionOptions } from './types'

/** Giảm sáng tạo — bớt gộp câu / bớt bịa chữ khi tách đề. */
const OLLAMA_STABLE_OPTS = { temperature: 0.12, top_p: 0.85 }

function withStableGeneration(body: Record<string, unknown>): Record<string, unknown> {
  const prev = (body.options as Record<string, unknown> | undefined) || {}
  return { ...body, options: { ...OLLAMA_STABLE_OPTS, ...prev } }
}

function stripJsonFence(raw: string): string {
  const t = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  if (fence) return fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) return t.slice(start, end + 1)
  return t
}

function normalizeKey(s: string): OptionKey {
  const u = s.trim().toUpperCase().slice(0, 1)
  if (u === 'A' || u === 'B' || u === 'C' || u === 'D') return u
  return 'A'
}

/** Lấy đáp án từ JSON — tránh lấy nhầm chữ cái đầu của chuỗi dài. */
function parseCorrectChoice(raw: unknown): OptionKey {
  if (raw == null) return 'A'
  const s = String(raw).trim().toUpperCase()
  if (/^[ABCD]$/i.test(s)) return s[0]!.toUpperCase() as OptionKey
  const m = s.match(/\b([ABCD])\b/)
  if (m) return m[1] as OptionKey
  return normalizeKey(s)
}

/**
 * Trích đáp án từ giải thích — chỉ khi có câu kết luận rõ (tránh khớp "phương án B sai").
 */
function inferLetterFromExplanation(explanation: string): OptionKey | null {
  const u = explanation.toUpperCase()
  const tail = u.slice(Math.max(0, u.length - 160))
  const k = tail.match(/KẾT\s*LUẬN\s*:\s*([ABCD])\b/)
  if (k?.[1]) return k[1] as OptionKey
  const d1 = u.match(/ĐÁP\s*ÁN\s*ĐÚNG\s+(?:LÀ\s*)?([ABCD])\b/)
  if (d1?.[1]) return d1[1] as OptionKey
  const d2 = u.match(/ĐÁP\s*ÁN\s*:\s*([ABCD])\s*\.?\s*$/m)
  if (d2?.[1]) return d2[1] as OptionKey
  return null
}

/** Nếu explanation kết luận một chữ và khác correct → ưu tiên kết luận (model tự mâu thuẫn). */
function reconcileCorrectWithExplanation(
  rawCorrect: OptionKey,
  explanation: string
): OptionKey {
  const inferred = inferLetterFromExplanation(explanation)
  if (!inferred) return rawCorrect
  if (inferred === rawCorrect) return rawCorrect
  return inferred
}

/** Ưu tiên qwen2.5-vl (tên Ollama: qwen2.5-vl, qwen2.5vl, …). */
export function pickPreferredVisionModel(names: string[]): string | null {
  if (names.length === 0) return null
  const norm = (s: string) => s.toLowerCase().replace(/_/g, '').replace(/\s/g, '')
  const score = (n: string) => {
    const x = norm(n)
    if (x.includes('qwen2.5') && x.includes('vl')) return 3
    if (x.includes('qwen25') && x.includes('vl')) return 3
    if (x.includes('qwen') && x.includes('vl')) return 1
    return 0
  }
  let best = names[0]!
  let bestS = -1
  for (const n of names) {
    const s = score(n)
    if (s > bestS) {
      bestS = s
      best = n
    }
  }
  return best
}

export async function fetchOllamaModelNames(): Promise<string[]> {
  const r = await fetch('/api/ollama/tags')
  const text = await r.text()
  if (!r.ok) {
    try {
      const j = JSON.parse(text) as { error?: string }
      throw new Error(j.error || text.slice(0, 200))
    } catch {
      throw new Error(text.slice(0, 200) || `HTTP ${r.status}`)
    }
  }
  const data = JSON.parse(text) as { models?: Array<{ name?: string }> }
  return (data.models ?? []).map((m) => m.name).filter((n): n is string => Boolean(n))
}

async function ollamaChat(body: Record<string, unknown>): Promise<{
  message?: { content?: string }
}> {
  const r = await fetch('/api/ollama/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text.slice(0, 400) || `HTTP ${r.status}`)
  }
  if (!r.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: string }).error)
        : text.slice(0, 400)
    throw new Error(err)
  }
  return data as { message?: { content?: string } }
}

/**
 * Đọc ảnh đề → văn bản (Ollama chat + images). Khuyến nghị: qwen2.5-vl.
 */
export async function extractExamTextWithVision(
  model: string,
  imageDataUrl: string
): Promise<string> {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(imageDataUrl.trim())
  if (!m) throw new Error('Ảnh không phải data URL base64')
  const b64 = m[2]!.replace(/\s/g, '')

  const prompt = `Bạn đang đọc ảnh một đề thi trắc nghiệm tiếng Việt (có thể nhiều câu, mỗi câu có đáp án A B C D).

Nhiệm vụ: CHÉP NGUYÊN VĂN toàn bộ chữ/số/công thức nhìn thấy trên ảnh sang text thuần (không markdown, không giải thích).

Quy tắc bắt buộc:
- Giữ ĐÚNG từng chữ, dấu, số như trên ảnh; không diễn giải, không đổi từ đồng nghĩa, không tóm tắt.
- Nếu có tiêu đề chung, ghi một dòng đầu.
- Mỗi câu hỏi bắt đầu trên một dòng mới bằng "1." hoặc "Câu 1." (số tăng dần), rồi thân câu.
- Mỗi phương án bắt đầu bằng "A." "B." "C." "D." Có thể cùng dòng hoặc xuống dòng nhưng phải rõ A. B. C. D.
- Giữ đúng thứ tự trên ảnh (trên xuống, trái phải).`

  const data = await ollamaChat(
    withStableGeneration({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [b64],
        },
      ],
      stream: false,
      options: { temperature: 0.25 },
    })
  )

  const content = data.message?.content?.trim()
  if (!content) throw new Error('Ollama Vision không trả nội dung')
  return content
}

const CHUNK_SIZE = 8

const REFINE_CHUNK_CHARS = 7000

async function refineExamTextChunk(model: string, chunk: string): Promise<string> {
  const prompt = `Đoạn văn bản sau là một PHẦN của đề trắc nghiệm tiếng Việt (OCR/vision). Có thể lỗi chính tả, ký tự lạ.

Nhiệm vụ: sửa lỗi chính tả/dấu rõ ràng và xuống dòng; GIỮ NGUYÊN từng từ, cụm từ, số và công thức như trong đề (không diễn giải, không tóm tắt). Giữ đánh số câu và A. B. C. D.
Không thêm/bớt câu. Chỉ trả về text đã sửa, không markdown.

---
${chunk}
---`

  const data = await ollamaChat(
    withStableGeneration({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    })
  )
  const content = data.message?.content?.trim()
  if (!content) throw new Error('Ollama không trả văn bản chuẩn hóa')
  return content.replace(/^```[\s\S]*?\n/, '').replace(/\n```\s*$/, '').trim()
}

/**
 * Chuẩn hóa văn bản từ OCR/Vision — đoạn dài được chia để model không bỏ sót câu.
 */
export async function refineExamTextWithOllama(model: string, rawText: string): Promise<string> {
  const t = rawText.trim()
  if (!t) return rawText
  if (t.length <= REFINE_CHUNK_CHARS) {
    return refineExamTextChunk(model, t)
  }
  const parts: string[] = []
  let start = 0
  while (start < t.length) {
    let end = Math.min(start + REFINE_CHUNK_CHARS, t.length)
    if (end < t.length) {
      const p = t.lastIndexOf('\n\n', end)
      if (p > start + REFINE_CHUNK_CHARS * 0.35) end = p + 2
      else {
        const p2 = t.lastIndexOf('\n', end)
        if (p2 > start + REFINE_CHUNK_CHARS * 0.35) end = p2 + 1
      }
    }
    const piece = t.slice(start, end).trim()
    if (piece) parts.push(await refineExamTextChunk(model, piece))
    start = end
  }
  return parts.join('\n\n')
}

const MAX_EXAM_TEXT_FOR_STRUCTURE = 120_000
/** Khối nhỏ → model ít gộp nhiều câu thành một. */
const MAX_SEGMENT_CHARS = 4800

const VERBATIM_STRUCTURE = `NGUYÊN VĂN: Sao chép ĐÚNG chữ trong đề cho question, A, B, C, D (kể cả số, ký hiệu, công thức). Không tóm tắt, không diễn giải lại, không đổi từ đồng nghĩa. Chỉ sửa lỗi OCR hiển nhiên (ký tự rác cạnh chữ đúng).`

function optStr(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (v == null) return ''
  return String(v).trim()
}

/** Ước lượng số chỗ bắt đầu câu đánh số (để retry khi AI chỉ trả 1 câu). */
export function countQuestionMarkers(text: string): number {
  const re = /(?:^|\n)\s*(?:Câu\s+)?\d{1,3}\s*[.):：;；．\-–]\s+/gim
  const m = text.match(re)
  return m ? m.length : 0
}

/** Ước lượng số câu: max(đầu dòng số thứ tự, số dòng bắt đầu bằng A.) */
export function estimateExpectedQuestionCount(text: string): number {
  const markers = countQuestionMarkers(text)
  const aPat = /(?:^|\n)\s*A\s*[.):：;．]\s+/gim
  const aN = (text.match(aPat) || []).length
  return Math.max(markers, aN, 1)
}

function pickRicherSplit(text: string): string[] {
  const a = roughSplitExamBlocks(text)
  const b = numberSplitExamBlocks(text)
  return b.length > a.length ? b : a
}

function splitHugeSegments(blocks: string[], maxLen: number): string[] {
  const out: string[] = []
  for (const b of blocks) {
    if (b.length <= maxLen) {
      out.push(b)
      continue
    }
    let start = 0
    while (start < b.length) {
      let end = Math.min(start + maxLen, b.length)
      if (end < b.length) {
        const cut = b.lastIndexOf('\n', end)
        if (cut > start + maxLen * 0.35) end = cut + 1
      }
      const piece = b.slice(start, end).trim()
      if (piece) out.push(piece)
      start = end
    }
  }
  return out.length ? out : blocks
}

function buildPayloadFromAiJson(parsed: {
  title?: unknown
  questions?: unknown
}): ParsedQuizPayload {
  const rawList = parsed.questions
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('JSON không có mảng questions hợp lệ')
  }

  const built: ParsedQuizPayload['questions'] = []
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const question = optStr(o.question)
    const options: QuestionOptions = {
      A: optStr(o.A ?? o.a),
      B: optStr(o.B ?? o.b),
      C: optStr(o.C ?? o.c),
      D: optStr(o.D ?? o.d),
    }
    if (!question) continue
    if (![options.A, options.B, options.C, options.D].every(Boolean)) continue
    built.push({
      question,
      options,
      correct: 'A',
      explanation: 'Đáp án tạm A — bật chấm Ollama hoặc đối chiếu đề gốc.',
    })
  }

  if (built.length === 0) {
    throw new Error('AI không tách được câu nào đủ A–D')
  }

  const title = optStr(parsed.title) || 'Đề trắc nghiệm'
  return { title, questions: built }
}

async function chatStructureToPayload(
  model: string,
  prompt: string
): Promise<ParsedQuizPayload> {
  let lastErr: Error | undefined
  for (const useJsonFormat of [true, false]) {
    try {
      const resp = await ollamaChat(
        withStableGeneration({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          ...(useJsonFormat ? { format: 'json' } : {}),
        })
      )
      const content = resp.message?.content
      if (!content) throw new Error('Ollama không trả nội dung tách câu')
      const parsed = JSON.parse(stripJsonFence(content)) as {
        title?: unknown
        questions?: unknown
      }
      return buildPayloadFromAiJson(parsed)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      if (!useJsonFormat) throw lastErr
    }
  }
  throw lastErr ?? new Error('Không parse được JSON từ Ollama')
}

function promptStructureFull(clipped: string): string {
  return `Đây là văn bản đề trắc nghiệm tiếng Việt (OCR/vision, có thể lỗi).

Nhiệm vụ:
1) Tìm MỌI câu hỏi trắc nghiệm theo thứ tự từ trên xuống (mỗi câu có A B C D).
2) KHÔNG gộp nhiều câu thành một phần tử. Mỗi object trong "questions" = đúng MỘT câu.
3) "question" = thân câu (không gồm A.–D.). A/B/C/D = nội dung từng phương án.
4) ${VERBATIM_STRUCTURE}

Trả về DUY NHẤT JSON, không markdown:
{"title":"...","questions":[{"question":"...","A":"...","B":"...","C":"...","D":"..."}]}

Văn bản:
---
${clipped}
---`
}

function promptStructureSegment(clipped: string, idx: number, total: number): string {
  return `Đây là KHỐI ${idx}/${total} của một đề trắc nghiệm (có thể bị cắt theo công cụ).

Nhiệm vụ: tách MỌI câu trắc nghiệm trong khối này. Mỗi câu một phần tử. Không gộp câu.
${VERBATIM_STRUCTURE}

JSON duy nhất, không markdown:
{"title":"Đề trắc nghiệm","questions":[{"question":"...","A":"...","B":"...","C":"...","D":"..."}]}

Khối văn bản:
---
${clipped}
---`
}

function promptStructureForcedMulti(clipped: string, markerCount: number, expectedMin: number): string {
  const atLeast = Math.min(Math.max(markerCount, expectedMin, 2), 50)
  return `Văn bản sau có NHIỀU câu trắc nghiệm. Đếm heuristic khoảng ${markerCount} đầu câu đánh số; ước lượng tối thiểu ${expectedMin} câu.

BẮT BUỘC: mảng "questions" phải có ÍT NHẤT ${atLeast} phần tử nếu đề thực sự có đủ — TUYỆT ĐỐI KHÔNG gộp cả đề thành 1 câu.
Mỗi phần tử: một câu, đủ A B C D (chuỗi không rỗng).
${VERBATIM_STRUCTURE}

JSON duy nhất:
{"title":"...","questions":[...]}

Văn bản:
---
${clipped}
---`
}

function promptStructurePerPart(clipped: string, idx: number, total: number): string {
  return `Đoạn ${idx}/${total} của đề (thường 1 câu, có thể 2 nếu dính liền trong đoạn).

Tách MỌI câu trắc nghiệm có A B C D trong đoạn này. Không gộp hai câu khác số thành một.
${VERBATIM_STRUCTURE}

JSON duy nhất:
{"title":"Đề trắc nghiệm","questions":[{"question":"...","A":"...","B":"...","C":"...","D":"..."}]}

Đoạn:
---
${clipped}
---`
}

async function structureByNumberedParts(
  model: string,
  parts: string[],
  onS?: (message: string) => void
): Promise<ParsedQuizPayload> {
  const all: ParsedQuizPayload['questions'] = []
  let title = 'Đề trắc nghiệm'
  for (let i = 0; i < parts.length; i++) {
    const piece = parts[i]!
    onS?.(`Giữ nguyên văn — xử lý đoạn ${i + 1}/${parts.length}…`)
    try {
      const p = await chatStructureToPayload(model, promptStructurePerPart(piece, i + 1, parts.length))
      if (p.title && p.title !== 'Đề trắc nghiệm') title = p.title
      all.push(...p.questions)
    } catch {
      try {
        const fb = parseExamTextToQuiz(piece)
        all.push(...fb.questions)
        if (fb.title && title === 'Đề trắc nghiệm') title = fb.title
      } catch {
        /* bỏ qua đoạn hỏng */
      }
    }
  }
  if (all.length === 0) {
    throw new Error('Không tách được câu từ các đoạn đánh số')
  }
  return { title, questions: all }
}

/**
 * AI tách đề: ưu tiên từng đoạn đánh số khi có nhiều câu; khối nhỏ + giữ nguyên văn.
 */
export async function structureExamWithOllama(
  model: string,
  examText: string,
  callbacks?: { onSlice?: (message: string) => void }
): Promise<ParsedQuizPayload> {
  const t = examText.trim()
  if (!t) throw new Error('Văn bản đề rỗng')

  const clippedBase =
    t.length > MAX_EXAM_TEXT_FOR_STRUCTURE
      ? `${t.slice(0, MAX_EXAM_TEXT_FOR_STRUCTURE)}\n\n[... đã cắt do quá dài]`
      : t

  const onS = (msg: string) => callbacks?.onSlice?.(msg)
  const markers = countQuestionMarkers(clippedBase)
  const expected = estimateExpectedQuestionCount(clippedBase)
  const numberedParts = numberSplitExamBlocks(clippedBase)

  const useNumberedFirst =
    numberedParts.length >= 4 || (numberedParts.length >= 3 && expected >= 6)
  if (useNumberedFirst) {
    onS(
      `Phát hiện ${numberedParts.length} đoạn theo số câu (~${expected} câu ước lượng) — xử lý tuần tự, giữ nguyên văn…`
    )
    return structureByNumberedParts(model, numberedParts, onS)
  }

  let segments = splitHugeSegments(pickRicherSplit(clippedBase), MAX_SEGMENT_CHARS)
  if (segments.length === 0) segments = [clippedBase]

  if (segments.length === 1) {
    const only = segments[0]!
    onS('AI đang tách toàn bộ đề (giữ nguyên văn)…')
    let payload = await chatStructureToPayload(model, promptStructureFull(only))

    const shortVsMarkers =
      markers >= 3 && payload.questions.length < Math.max(2, Math.ceil(markers * 0.45))
    const shortVsExpected =
      expected >= 4 && payload.questions.length < Math.max(2, Math.ceil(expected * 0.45))

    if (shortVsMarkers || shortVsExpected) {
      onS(`Chỉ ${payload.questions.length} câu — thử ép tách đủ (ước ~${expected}, marker ${markers})…`)
      try {
        const retry = await chatStructureToPayload(
          model,
          promptStructureForcedMulti(only, markers, expected)
        )
        if (retry.questions.length > payload.questions.length) payload = retry
      } catch {
        /* giữ payload */
      }
    }

    if (
      numberedParts.length >= 2 &&
      payload.questions.length < numberedParts.length &&
      payload.questions.length < Math.max(3, expected - 1)
    ) {
      onS(`Tách theo ${numberedParts.length} đoạn đánh số để đủ câu…`)
      try {
        const perPart = await structureByNumberedParts(model, numberedParts, onS)
        if (perPart.questions.length > payload.questions.length) payload = perPart
      } catch {
        /* giữ payload */
      }
    }

    return payload
  }

  const all: ParsedQuizPayload['questions'] = []
  let title = 'Đề trắc nghiệm'
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    onS(`AI tách khối ${i + 1}/${segments.length}…`)
    try {
      const part = await chatStructureToPayload(
        model,
        promptStructureSegment(seg, i + 1, segments.length)
      )
      if (part.title && part.title !== 'Đề trắc nghiệm') title = part.title
      all.push(...part.questions)
    } catch {
      try {
        const fb = parseExamTextToQuiz(seg)
        all.push(...fb.questions)
        if (fb.title && title === 'Đề trắc nghiệm') title = fb.title
      } catch {
        /* bỏ qua khối hỏng */
      }
    }
  }

  if (all.length === 0) {
    throw new Error('Không tách được câu từ các khối — thử model lớn hơn hoặc ảnh rõ hơn')
  }

  let merged = { title, questions: all }
  if (
    numberedParts.length >= 3 &&
    merged.questions.length < numberedParts.length &&
    merged.questions.length < Math.max(3, Math.ceil(expected * 0.45))
  ) {
    onS(`Ghép khối thiếu câu — chạy lại theo ${numberedParts.length} đoạn đánh số…`)
    try {
      const perPart = await structureByNumberedParts(model, numberedParts, onS)
      if (perPart.questions.length > merged.questions.length) merged = perPart
    } catch {
      /* giữ merged */
    }
  }

  return merged
}

/**
 * Gán đáp án đúng + giải thích bằng Ollama (local), theo từng nhóm câu.
 */
export async function enrichPayloadWithOllama(
  model: string,
  payload: ParsedQuizPayload,
  onProgress?: (message: string, percentApprox?: number) => void
): Promise<ParsedQuizPayload> {
  const qs = payload.questions
  if (qs.length === 0) return payload

  const merged: Array<{ correct: OptionKey; explanation: string }> = []

  for (let start = 0; start < qs.length; start += CHUNK_SIZE) {
    const chunk = qs.slice(start, start + CHUNK_SIZE)
    const end = start + chunk.length
    const pct = 90 + Math.round((start / qs.length) * 9)
    onProgress?.(`Ollama — câu ${start + 1}–${end} / ${qs.length}…`, pct)

    const slim = chunk.map((q, i) => ({
      index: start + i + 1,
      question: q.question,
      options: q.options,
    }))

    const prompt = `Bạn là giáo viên chấm trắc nghiệm. Với MỖI câu trong dữ liệu, xác định đáp án đúng dựa trên kiến thức (không đoán bừa).

Quy tắc BẮT BUỘC:
- Mỗi phần tử trong "answers" phải có "index" TRÙNG số "index" của câu tương ứng trong dữ liệu (không đổi thứ tự).
- "correct" chỉ được là MỘT ký tự: A, B, C hoặc D (không ghi "đáp án A", không thêm chữ).
- "explanation": 1–3 câu tiếng Việt; CUỐI CÙNG phải có đúng dạng: "Kết luận: X." với X là cùng giá trị "correct" (X ∈ A,B,C,D).

Trả về DUY NHẤT JSON, không markdown, đúng ${chunk.length} phần tử:
{"answers":[{"index":${slim[0]?.index ?? 1},"correct":"A","explanation":"... Kết luận: A."},...]}

Dữ liệu câu hỏi (giữ nguyên thứ tự):
${JSON.stringify(slim, null, 2)}`

    type AnsRow = { index?: number; correct?: string; explanation?: string }
    let answers: AnsRow[] | null = null
    let lastErr: Error | undefined

    for (const useJsonFormat of [true, false]) {
      try {
        const resp = await ollamaChat(
          withStableGeneration({
            model,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            ...(useJsonFormat ? { format: 'json' } : {}),
          })
        )
        const content = resp.message?.content
        if (!content) throw new Error('Ollama không trả message.content')
        const parsed = JSON.parse(stripJsonFence(content)) as {
          answers?: AnsRow[]
        }
        let arr = parsed.answers ?? []
        if (arr.length !== chunk.length) {
          throw new Error(
            `Ollama trả ${arr.length} đáp án, cần ${chunk.length}. Thử model lớn hơn hoặc bớt câu mỗi lần.`
          )
        }
        const allIndexed = arr.every(
          (a) => typeof a.index === 'number' && Number.isFinite(a.index)
        )
        if (allIndexed) {
          const byIdx = new Map<number, AnsRow>()
          for (const a of arr) {
            byIdx.set(a.index as number, a)
          }
          arr = slim.map((s, j) => byIdx.get(s.index) ?? arr[j] ?? { index: s.index })
        }
        answers = arr
        break
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e))
        if (!useJsonFormat) throw lastErr
      }
    }

    if (!answers) throw lastErr ?? new Error('Ollama không trả JSON hợp lệ')

    for (let j = 0; j < answers.length; j++) {
      const a = answers[j]!
      const exp = (a.explanation ?? 'Theo Ollama.').trim()
      let correct = parseCorrectChoice(a.correct)
      correct = reconcileCorrectWithExplanation(correct, exp)
      merged.push({ correct, explanation: exp })
    }
  }

  const questions = payload.questions.map((q, i) => ({
    ...q,
    correct: merged[i]!.correct,
    explanation: merged[i]!.explanation,
  }))

  return { ...payload, questions }
}
