// DEPRECATED: OCR moved to server/ocrProxy.ts for security (no client API key)
// Use analyzeQuizImage() - it calls server /api/ocr/extract internally

export async function extractExamTextWithAiStudio(): Promise<never> {
  throw new Error('Direct OCR disabled. Use analyzeQuizImage which proxies to server.');
}
