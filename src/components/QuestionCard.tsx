import type { OptionKey, QuestionType } from '../lib/types'

const KEYS: OptionKey[] = ['A', 'B', 'C', 'D']

interface QuestionCardProps {
  question: QuestionType
  selected: OptionKey | null
  onSelect: (key: OptionKey) => void
  disabled?: boolean
  showSolution?: boolean
}

export function QuestionCard({
  question,
  selected,
  onSelect,
  disabled,
  showSolution,
}: QuestionCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-base font-medium leading-relaxed text-gray-900">{question.question}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {KEYS.map((k) => {
          const text = question.options[k]
          const isSel = selected === k
          const isCorrect = k === question.correct
          let ring = 'border-gray-200'
          if (showSolution) {
            if (isCorrect) ring = 'border-emerald-500 bg-emerald-50'
            else if (isSel && !isCorrect) ring = 'border-red-400 bg-red-50'
          } else if (isSel) {
            ring = 'border-[#3B82F6] bg-[#EFF6FF]'
          }
          return (
            <li key={k}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(k)}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${ring} ${
                  disabled && !showSolution ? 'opacity-80' : ''
                }`}
              >
                <span className="mt-0.5 font-bold text-[#3B82F6]">{k}.</span>
                <span className="text-gray-800">{text}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {showSolution && question.explanation ? (
        <p className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
          <span className="font-semibold text-gray-900">Giải thích: </span>
          {question.explanation}
        </p>
      ) : null}
    </div>
  )
}
