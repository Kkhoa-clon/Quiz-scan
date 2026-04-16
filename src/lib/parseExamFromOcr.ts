import type { OptionKey, ParsedQuizPayload, QuestionOptions } from './types'

function normalizeExamText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–/g, '-')
    .replace(/；/g, ';')
    .replace(/：/g, ':')
    .replace(/。/g, '.')
    .replace(/，/g, ',')
    .replace(/…/g, '...')
    .replace(/\s+([.,:;?!])/g, '$1')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function normalizeOcrArtifacts(text: string): string {
  return text
    .replace(/\bCau\b/gi, 'Câu')
    .replace(/\bCâu\s*\.?\s*(\d{1,3})\b/gi, 'Câu $1.')
    .replace(/\b(\d{1,3})\s*[\)\:-]+\s*/g, '$1. ')
    .replace(/\b([A-Da-d])\s*[\.:：;，、]*/g, '$1. ')
    .replace(/A\s*\.\s*\n/g, 'A.\n')
    .replace(/B\s*\.\s*\n/g, 'B.\n')
    .replace(/C\s*\.\s*\n/g, 'C.\n')
    .replace(/D\s*\.\s*\n/g, 'D.\n')
    .replace(/\b0([1-9])\b/g, '$1')
    .replace(/\b1\s+\.\s+/g, '1. ')
    .replace(/\bO\s*\.\s+/g, 'O. ')
    .replace(/\b(\d)\s+[\./]\s+(\d)\b/g, '$1.$2')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function normalizeForParse(raw: string): string {
  return normalizeOcrArtifacts(normalizeExamText(raw))
}

function isParsedQuestionValid(parsed: { question: string; options: QuestionOptions }): boolean {
  const values = Object.values(parsed.options)
  return (
    parsed.question.length >= 10 &&
    values.every((opt) => opt.length >= 2) &&
    values.some((opt) => /[\p{L}\d]/u.test(opt))
  )
}

/**
 * Tách "A. x B. y" trên cùng dòng → nhiều dòng để parseBlock đọc được.
 */
function expandInlineOptionMarkers(block: string): string {
  return block.replace(/\s+([A-Da-d])\s*[.):：;．\-–、，,]\s*/g, '\n$1. ')
}

/**
 * Chèn xuống dòng trước "2." / "Câu 2" khi OCR/Vision dồn một hàng.
 */
function injectNewlinesBeforeQuestionNumbers(text: string): string {
  return text.replace(/\s+((?:Câu\s+)?\d{1,3}\s*[.):：;；．\-–]\s+)/gi, '\n$1')
}

/**
 * Tách khối theo đầu câu "1." / "Câu 1." (đầu dòng hoặc sau inject).
 */
function splitQuestionBlocks(text: string): string[] {
  const t0 = normalizeExamText(text)
  if (!t0) return []

  const nlCount = (t0.match(/\n/g) || []).length
  const working =
    nlCount < 12 && t0.length > 80 ? injectNewlinesBeforeQuestionNumbers(t0) : t0

  const chunks = working.split(
    /(?=(?:^|\n)\s*(?:Câu\s+)?\d{1,3}\s*[.):：;；．\-–]\s*)/im
  )
  let blocks = chunks.map((c) => c.trim()).filter(Boolean)

  if (
    blocks.length > 0 &&
    !/^(?:Câu\s+)?\d{1,3}\s*[.):：;；．\-–]/i.test(blocks[0]!)
  ) {
    if (blocks.length > 1) blocks = blocks.slice(1)
  }

  if (blocks.length <= 1) {
    const byScan = splitBlocksByScanningHeaders(working)
    if (byScan.length > 1) return byScan
  }

  return blocks.length ? blocks : [t0]
}

/** Dò vị trí bắt đầu câu (số + dấu câu) khi split lookahead thất bại. */
function splitBlocksByScanningHeaders(t: string): string[] {
  const re = /(?:^|\n)\s*((?:Câu\s+)?\d{1,3}\s*[.):：;；．\-–]\s*)/gim
  const starts: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(t)) !== null) {
    const inner = m[1]!
    const idx = m.index + m[0].indexOf(inner)
    if (idx >= 0) starts.push(idx)
  }
  const uniq = [...new Set(starts)].sort((a, b) => a - b)
  if (uniq.length <= 1) return [t]
  const out: string[] = []
  for (let i = 0; i < uniq.length; i++) {
    out.push(t.slice(uniq[i], uniq[i + 1] ?? t.length).trim())
  }
  return out.filter(Boolean)
}

function parseBlock(block: string): { question: string; options: QuestionOptions } | null {
  const expanded = expandInlineOptionMarkers(block.trim())

  const opts: Partial<Record<OptionKey, string>> = {}
  const lines = expanded.split('\n').map((l) => l.trim()).filter(Boolean)
  const stemLines: string[] = []
  let mode: 'stem' | 'opts' = 'stem'
  let currentOpt: OptionKey | null = null

  const optLine =
    /^([A-Da-d])\s*[.):：;．\-–、，,]\s*(.+)$/

  let stemLineIndex = 0
  for (const line of lines) {
    const trimmed = line.trim()
    const stripped =
      stemLineIndex === 0
        ? trimmed.replace(/^\s*(?:Câu\s+)?\d{1,3}\s*[.):：;；．\-–]\s*/i, '').trim()
        : trimmed
    const optMatch = stripped.match(optLine)
    if (optMatch && optMatch[2]!.trim().length > 0) {
      mode = 'opts'
      currentOpt = optMatch[1]!.toUpperCase() as OptionKey
      opts[currentOpt] = optMatch[2]!.trim()
    } else if (mode === 'stem') {
      stemLines.push(stripped)
      stemLineIndex += 1
    } else if (currentOpt) {
      opts[currentOpt] = `${opts[currentOpt] || ''} ${stripped}`.trim()
    }
  }

  const options: QuestionOptions = {
    A: (opts.A || '').trim(),
    B: (opts.B || '').trim(),
    C: (opts.C || '').trim(),
    D: (opts.D || '').trim(),
  }

  if (![options.A, options.B, options.C, options.D].every(Boolean)) return null

  const question = stemLines.join(' ').trim()
  if (!question) return null
  return { question, options }
}

/** Tách đề thành các khối theo số câu (1. / Câu 1.) — dùng trước khi gọi AI từng khối. */
export function roughSplitExamBlocks(text: string): string[] {
  return splitQuestionBlocks(text)
}

/**
 * Tách theo vị trí "1." / "Câu 1." trên toàn văn (dò index) — thường ra nhiều khối hơn split lookahead.
 */
export function numberSplitExamBlocks(raw: string): string[] {
  const t0 = normalizeExamText(raw)
  if (!t0) return []
  const nlCount = (t0.match(/\n/g) || []).length
  const working =
    nlCount < 28 && t0.length > 40 ? injectNewlinesBeforeQuestionNumbers(t0) : t0
  let blocks = splitBlocksByScanningHeaders(working)
  if (blocks.length <= 1) {
    blocks = splitQuestionBlocks(t0)
  }
  return blocks.map((b) => b.trim()).filter((b) => b.length > 12)
}

/**
 * Regex / heuristics trên text OCR hoặc Vision — không cần API ngoài.
 * Đáp án đúng mặc định A + giải thích (chưa có key) nếu chưa qua Ollama.
 */
export function parseExamTextToQuiz(ocr: string): ParsedQuizPayload {
  const text = normalizeForParse(ocr)
  if (!text) {
    throw new Error('Không có chữ — thử ảnh rõ hơn hoặc bật Ollama Vision.')
  }

  let title = 'Đề trắc nghiệm'
  const questions: ParsedQuizPayload['questions'] = []
  const blocks = splitQuestionBlocks(text)

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!
    const parsed = parseBlock(b)
    if (parsed && isParsedQuestionValid(parsed)) {
      questions.push({
        ...parsed,
        correct: 'A',
        explanation:
          'Tự động: chưa có đáp án đúng từ đề. Đang đặt tạm A — đối chiếu đề gốc hoặc bật Ollama đáp án.',
      })
    } else if (i === 0 && questions.length === 0) {
      const firstLine = b.split('\n')[0]?.trim() ?? ''
      if (
        firstLine &&
        !/^\d{1,3}\s*[.)]/.test(firstLine) &&
        !/^Câu\s+\d+/i.test(firstLine)
      ) {
        title = firstLine.slice(0, 200)
      }
    }
  }

  if (questions.length === 0) {
    const one = parseBlock(text)
    if (one) {
      questions.push({
        ...one,
        correct: 'A',
        explanation: 'Một khối câu hỏi từ toàn bộ văn bản. Kiểm tra lại từng phương án.',
      })
    } else {
      throw new Error(
        'Không nhận dạng được định dạng đề (cần A. B. C. D. hoặc A) B) …). Thử Vision hoặc ảnh thẳng, sáng hơn.'
      )
    }
  }

  return { title, questions }
}
