import * as mammoth from 'mammoth'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore pdfjs-dist has a generated ESM module path for the browser build.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\s+([.,:;?!])/g, '$1')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractTextFromPdf(file: File): Promise<string> {
  const raw = new Uint8Array(await file.arrayBuffer())
  const loadingTask = (pdfjsLib as any).getDocument({ data: raw, disableWorker: true })
  const pdf = await loadingTask.promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as Array<any>)
      .map((item) => String(item.str ?? ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) {
      pages.push(pageText)
    }
  }

  return pages.join('\n\n')
}

async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ext) {
    throw new Error('Không xác định được định dạng file.')
  }

  switch (ext) {
    case 'txt':
      return normalizeExtractedText(await file.text())
    case 'pdf':
      return normalizeExtractedText(await extractTextFromPdf(file))
    case 'docx':
    case 'doc':
      return normalizeExtractedText(await extractTextFromWord(file))
    default:
      throw new Error('Định dạng file không hỗ trợ. Chỉ nhận .doc, .docx, .pdf, .txt.')
  }
}
