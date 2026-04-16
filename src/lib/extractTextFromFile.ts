import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Setup PDF.js worker for Vite (pdfjs-dist 5.x)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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
  try {
    const raw = new Uint8Array(await file.arrayBuffer())
    console.log('PDF size:', raw.length, 'bytes') // Debug
    
    const loadingTask = (pdfjsLib as any).getDocument({ 
      data: raw, 
      verbosity: 0,
      standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
    })
    const pdf = await loadingTask.promise
    console.log(`PDF loaded: ${pdf.numPages} pages`)

    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i += 1) {
      try {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent({ normalizeWhitespace: true })
        let pageText = content.items
          .map((item: any) => (item.str || '').trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
        
        console.log(`Page ${i}: ${pageText ? pageText.length + ' chars' : 'empty'}`)
        
        if (pageText.length > 5) {
          pages.push(pageText)
        }
      } catch (pageErr) {
        console.warn(`Page ${i} error:`, pageErr)
      }
    }

    const fullText = pages.join('\n\n')
    if (!fullText.trim()) {
      throw new Error('PDF không có text layer (scan/image-based) hoặc rỗng. Thử ảnh chụp thay.')
    }
    console.log('PDF full text:', fullText.slice(0, 200))
    return fullText
  } catch (error) {
    console.error('PDF extract failed:', error)
    throw new Error(`Lỗi đọc PDF: ${(error as Error).message}. Thử convert sang .docx hoặc ảnh.`)
  }
}

async function extractTextFromWord(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    throw new Error(`Lỗi đọc Word: ${(error as Error).message}`)
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ext) {
    throw new Error('Không xác định được định dạng file.')
  }

  console.log('Extracting file:', file.name, ext, file.size, 'bytes')

  switch (ext) {
    case 'txt':
      return normalizeExtractedText(await file.text())
    case 'pdf':
      return normalizeExtractedText(await extractTextFromPdf(file))
    case 'docx':
    case 'doc':
      return normalizeExtractedText(await extractTextFromWord(file))
    default:
      throw new Error('Chỉ hỗ trợ .txt, .pdf, .doc, .docx.')
  }
}

