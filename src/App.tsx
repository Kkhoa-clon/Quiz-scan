import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QuizFlowProvider } from './context/QuizFlowProvider'
import { HomePage } from './components/HomePage'
import { HistoryPage } from './components/HistoryPage'
import { QuizInputPage } from './components/QuizInputPage'
import { PlayRoute } from './components/PlayRoute'
import { ResultRoute } from './components/ResultRoute'
import { SavedQuizRoute } from './components/SavedQuizRoute'

export default function App() {
  return (
    <QuizFlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/scan" element={<QuizInputPage />} />
          <Route path="/play" element={<PlayRoute />} />
          <Route path="/result" element={<ResultRoute />} />
          <Route path="/saved/:id" element={<SavedQuizRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QuizFlowProvider>
  )
}
