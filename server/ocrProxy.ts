import express from 'express';
import sharp from 'sharp';
const fetch = globalThis.fetch as typeof fetch;

const AISTUDIO_OCR_URL = 'https://iej9r9uem3n0k4p4.aistudio-app.com/layout-parsing'; // from vite proxy target

async function extractExamTextWithAiStudio(
  apiToken: string,
  imageBuffer: Buffer
): Promise<string> {
  if (!apiToken?.trim()) {
    throw new Error('API_KEY not set');
  }

  const base64Image = imageBuffer.toString('base64');

  const payload = {
    file: base64Image,
    fileType: 1,
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useChartRecognition: false,
  };

  const response = await fetch(AISTUDIO_OCR_URL, {
    method: 'POST',
    headers: {
      Authorization: `token ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    console.error('OCR API Error:', response.status, response.statusText, bodyText);
    throw new Error(`OCR API error: ${response.status} - ${bodyText.slice(0, 200)}`);
  }

  const data = await response.json() as any;
  const result = data?.result;
  const layoutResults = result?.layoutParsingResults;

  if (!Array.isArray(layoutResults) || layoutResults.length === 0) {
    throw new Error('No layoutParsingResults');
  }

  const texts = layoutResults
    .map((item: any) => item?.markdown?.text?.trim())
    .filter((text: string) => text && text.length > 0);

  if (texts.length === 0) {
    const altTexts = layoutResults
      .map((item: any) => item?.prunedResult?.parsing_res_list?.map((p: any) => p?.text)?.join('\n') || '')
      .filter((text: string) => text && text.length > 0);
    if (altTexts.length > 0) {
      return altTexts.join('\n\n');
    }
    throw new Error('No text extracted');
  }

  return texts.join('\n\n');
}

export function createOcrProxy(): express.Router {
  const router = express.Router();
  router.use(express.raw({ type: 'image/*', limit: '20mb' }));

  router.post('/extract', async (req, res) => {
    try {
      const apiToken = process.env.API_KEY;
      if (!apiToken) {
        return res.status(500).json({ error: 'Server misconfigured: API_KEY missing' });
      }

      // Optimize image with sharp
      const optimizedBuffer = await sharp(req.body)
        .resize(1800, null, { withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      const examText = await extractExamTextWithAiStudio(apiToken, optimizedBuffer);
      res.json({ examText });
    } catch (e: any) {
      console.error('OCR Proxy Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

