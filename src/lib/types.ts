export type OptionKey = 'A' | 'B' | 'C' | 'D'

export interface QuestionOptions {
  A: string
  B: string
  C: string
  D: string
}

export interface QuestionType {
  id: number
  question: string
  options: QuestionOptions
  correct: OptionKey
  explanation: string
  userAnswer?: OptionKey | null
  isCorrect?: boolean
}

export interface QuizDoc {
  id: string
  userId: string
  title: string
  createdAt: string
  imageUrl: string | null
  questions: QuestionType[]
  score: number
  totalQuestions: number
}

/** Payload từ OCR + LLM trước khi gán id / userAnswer */
export interface ParsedQuizPayload {
  title: string
  questions: Array<{
    question: string
    options: QuestionOptions
    correct: OptionKey
    explanation: string
  }>
}
