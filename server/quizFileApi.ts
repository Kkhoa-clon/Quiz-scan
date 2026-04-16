import express, { type Express } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

/** Payload JSON lưu đĩa — đủ field app cần, không import từ src (tách tsconfig). */
type QuizJson = {
  id: string
  userId?: string
  title?: string
  createdAt?: string
  imageUrl?: string | null
  questions?: unknown[]
  score?: number
  totalQuestions?: number
  [key: string]: unknown
}

import { createOcrProxy } from './ocrProxy';

export type QuizApiOptions = {
  /** Ví dụ http://127.0.0.1:11434 hoặc http://host.docker.internal:11434 */
  ollamaHost?: string
}

export function createQuizApiApp(dataDir: string, options?: QuizApiOptions): Express {
  const ollamaBase = (
    options?.ollamaHost ||
    process.env.OLLAMA_HOST ||
    'http://127.0.0.1:11434'
  ).replace(/\/$/, '')

  const app = express()
  app.use(express.json({ limit: '40mb' }))
  app.use(express.raw({ type: 'image/*', limit: '20mb' })) // for OCR

  // No auth for local dev (simple)
  // Uncomment for prod:
  /*
  const authToken = process.env.API_AUTH_TOKEN || 'quizscan-local-token-change-me';
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${authToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
  */

  // Mount OCR proxy
  app.use('/ocr', createOcrProxy());

  /** Proxy Ollama — trình duyệt gọi same-origin, tránh CORS. */
  app.get('/ollama/tags', async (_req, res) => {
    const base = ollamaBase
    try {
      const r = await fetch(`${base}/api/tags`)
      const text = await r.text()
      res
        .status(r.status)
        .type(r.headers.get('content-type') || 'application/json; charset=utf-8')
        .send(text)
    } catch (e: unknown) {
      console.error(e)
      res.status(502).json({
        error: `Không kết nối Ollama tại ${base}. Chạy \`ollama serve\` hoặc đặt OLLAMA_HOST trong .env.local.`,
      })
    }
  })

  app.post('/ollama/chat', async (req, res) => {
    const base = ollamaBase
    try {
      const r = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      const text = await r.text()
      res
        .status(r.status)
        .type(r.headers.get('content-type') || 'application/json; charset=utf-8')
        .send(text)
    } catch (e: unknown) {
      console.error(e)
      res.status(502).json({ error: String(e instanceof Error ? e.message : e) })
    }
  })

  async function ensureDir() {
    await fs.mkdir(dataDir, { recursive: true })
  }

  function safeId(id: string | undefined): string | null {
    return typeof id === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(id) ? id : null
  }

  function jsonPath(id: string) {
    return path.join(dataDir, `${id}.json`)
  }

  function imagePath(id: string) {
    return path.join(dataDir, `${id}.jpg`)
  }

  function withImageUrl(quiz: QuizJson): QuizJson {
    const id = quiz.id
    if (!id) return quiz
    if (existsSync(imagePath(id))) {
      return { ...quiz, imageUrl: `/api/quizzes/${id}/image` }
    }
    return { ...quiz, imageUrl: quiz.imageUrl ?? null }
  }

  app.get('/quizzes', async (_req, res) => {
    try {
      await ensureDir()
      const names = await fs.readdir(dataDir)
      const jsonFiles = names.filter((n) => n.endsWith('.json'))
      const items: QuizJson[] = []
      for (const f of jsonFiles) {
        try {
          const raw = await fs.readFile(path.join(dataDir, f), 'utf8')
          const doc = JSON.parse(raw) as QuizJson
          if (doc?.id) items.push(withImageUrl(doc))
        } catch {
          /* bỏ qua file hỏng */
        }
      }
      items.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      res.json(items)
    } catch (e: unknown) {
      console.error(e)
      res.status(500).json({ error: String(e instanceof Error ? e.message : e) })
    }
  })

  app.get('/quizzes/:id/image', (req, res) => {
    const id = safeId(req.params.id)
    if (!id) return res.status(400).end()
    const p = imagePath(id)
    if (!existsSync(p)) return res.status(404).end()
    res.setHeader('Content-Type', 'image/jpeg')
    res.sendFile(path.resolve(p))
  })

  app.get('/quizzes/:id', async (req, res) => {
    const id = safeId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id không hợp lệ' })
    try {
      const p = jsonPath(id)
      const raw = await fs.readFile(p, 'utf8')
      const doc = JSON.parse(raw) as QuizJson
      res.json(withImageUrl(doc))
    } catch {
      res.status(404).json({ error: 'Không tìm thấy' })
    }
  })

  app.put('/quizzes/:id', async (req, res) => {
    const id = safeId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id không hợp lệ' })
    const body = req.body as { quiz?: QuizJson; imageDataUrl?: string } | undefined
    const { quiz, imageDataUrl } = body || {}
    if (!quiz || quiz.id !== id) {
      return res.status(400).json({ error: 'Thiếu quiz hoặc id không khớp' })
    }
    try {
      await ensureDir()
      let toSave: QuizJson = { ...quiz }

      if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
        const m = /^data:([^;]+);base64,(.+)$/.exec(imageDataUrl)
        if (m) {
          await fs.writeFile(imagePath(id), Buffer.from(m[2], 'base64'))
          toSave = { ...toSave, imageUrl: `/api/quizzes/${id}/image` }
        }
      } else if (existsSync(imagePath(id))) {
        toSave = { ...toSave, imageUrl: `/api/quizzes/${id}/image` }
      }

      await fs.writeFile(jsonPath(id), JSON.stringify(toSave, null, 2), 'utf8')
      res.json(withImageUrl(toSave))
    } catch (e: unknown) {
      console.error(e)
      res.status(500).json({ error: String(e instanceof Error ? e.message : e) })
    }
  })

  app.delete('/quizzes/:id', async (req, res) => {
    const id = safeId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id không hợp lệ' })
    try {
      await fs.unlink(jsonPath(id)).catch(() => {})
      await fs.unlink(imagePath(id)).catch(() => {})
      res.status(204).end()
    } catch (e: unknown) {
      res.status(500).json({ error: String(e instanceof Error ? e.message : e) })
    }
  })

  return app
}
