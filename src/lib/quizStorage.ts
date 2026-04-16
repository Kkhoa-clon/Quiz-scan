import type { ParsedQuizPayload, QuestionType, QuizDoc } from './types'

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`/api${path}`, options);
}

async function apiGet<T>(path: string): Promise<T> {
  const r = await apiRequest(path);
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.statusText || `HTTP ${r.status}`)
  }
  return r.json() as Promise<T>
}

async function apiPut(path: string, body: unknown): Promise<void> {
  const r = await apiRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.statusText || `HTTP ${r.status}`)
  }
}

function payloadToQuiz(
  payload: ParsedQuizPayload,
  partial: Pick<QuizDoc, 'id' | 'userId' | 'imageUrl'>
): QuizDoc {
  const questions: QuestionType[] = payload.questions.map((q, i) => ({
    id: i + 1,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    userAnswer: null,
    isCorrect: undefined,
  }))
  return {
    ...partial,
    title: payload.title,
    createdAt: new Date().toISOString(),
    questions,
    score: 0,
    totalQuestions: questions.length,
  }
}

export async function listQuizzes(): Promise<QuizDoc[]> {
  return apiGet<QuizDoc[]>('/quizzes')
}

export async function getQuizById(id: string): Promise<QuizDoc | null> {
  try {
    return await apiGet<QuizDoc>(`/quizzes/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function saveQuiz(
  quiz: QuizDoc,
  imageDataUrl?: string | null
): Promise<void> {
  await apiPut(`/quizzes/${encodeURIComponent(quiz.id)}`, {
    quiz,
    imageDataUrl: imageDataUrl ?? undefined,
  })
}

export { payloadToQuiz }

