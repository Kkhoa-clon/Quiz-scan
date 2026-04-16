## TODO: Remove Delete Feature

✅ **Plan approved by user.**

**Pending Steps:**
## COMPLETED: Delete Feature Removed

✅ **All edits done per plan.**

**Updated Steps:**
1. ✅ Created TODO.md
2. ✅ src/lib/quizStorage.ts: Removed apiDelete + deleteQuiz
3. ✅ src/hooks/useQuizzes.ts: Removed deleteQuiz
4. ✅ src/components/QuizCard.tsx: Removed handleDelete/useQuizzes destructuring/"Xóa" button
5. ✅ src/components/HistoryPage.tsx: Removed bulk delete/checkboxes/select logic/UI
6. ✅ src/components/EditQuizPage.tsx: Removed deleteQuestion/"Xóa câu" buttons, updated subtitle text

**Test Recommendation:** `npm run dev` → Navigate to /history (simple list, no checkboxes/delete), click QuizCard (Chơi/Sửa only), /edit/:id (questions w/o delete/add only).

No errors expected. Feature fully removed.
