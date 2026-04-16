import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createQuizApiApp } from './quizFileApi'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
dotenv.config({ path: path.join(root, '.env.local') })
dotenv.config({ path: path.join(root, '.env') })
process.env.API_KEY = process.env.API_KEY || process.env.VITE_API_KEY; // migrate from VITE_
process.env.API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || 'quizscan-local-token-change-in-prod';
const dataDir = path.join(root, 'data', 'quizzes')
const port = Number(process.env.PORT) || 4173
const host = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1'

const app = express()
app.use('/api', createQuizApiApp(dataDir, { ollamaHost: process.env.OLLAMA_HOST }))
app.use(express.static(path.join(root, 'dist')))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(root, 'dist', 'index.html'))
})

app.listen(port, host, () => {
  console.log(`QuizScan: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)
  if (host === '0.0.0.0') console.log('Trên điện thoại: http://<IP-máy-tính>:' + port)
})
