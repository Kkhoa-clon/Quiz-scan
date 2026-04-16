# QuizScan

Ứng dụng xử lý và chơi đề thi trắc nghiệm.

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
# Development (mở http://localhost:5173)
npm run dev

# Build production
npm run build

# Preview build local
npm run preview
```

## Cấu hình

### Ollama (khuyến nghị - thay thế OCR)

Cài đặt [Ollama](https://ollama.ai/) để xử lý ảnh đề thi bằng Vision (llama3.2-vision), chuẩn hóa văn bản, tách câu hỏi và chấm điểm.

```bash
# Cài model Vision chính
ollama pull llama3.2-vision

# Model text backup (nếu cần)
ollama pull qwen2.5-coder:3b
```

Tạo `.env` (copy `.env.example` nếu có):

```env
OLLAMA_HOST=http://127.0.0.1:11434
```


## Tính năng chính

- **Tạo bài kiểm tra** từ ảnh chụp đề thi (Ollama Vision), file ảnh, hoặc nhập văn bản thủ công
- **Phân tích tự động**: Trích xuất câu hỏi, đáp án, đáp án đúng bằng AI
- **Chơi bài kiểm tra** với timer, theo dõi tiến độ
- **Chấm điểm tự động** kèm giải thích chi tiết
- **Lưu & quản lý bài kiểm tra**:
  - Xem lịch sử các bài đã lưu
  - **Xóa bài kiểm tra** không cần thiết
  - **Chỉnh sửa bài kiểm tra**: Sửa lỗi AI bằng cách chỉnh câu hỏi, đáp án A/B/C/D, đáp án đúng
- **Xem kết quả** chi tiết với phân tích điểm mạnh/yếu

## Luồng sử dụng

1. Chụp ảnh đề thi → Upload → AI phân tích → Xem trước → Lưu
2. Vào **Lịch sử** → Chọn bài → **Chơi lại** hoặc **Chỉnh sửa**
3. Hoàn thành → Xem **Kết quả** → Lưu kết quả mới

## Dữ liệu

Bài kiểm tra lưu dạng JSON trong `data/quizzes/`. Backup thủ công nếu cần.

## Troubleshooting

- **Ollama không kết nối**: Kiểm tra `ollama serve` đang chạy và model đã pull.
- **Lỗi phân tích**: Thử model khác trong app hoặc chỉnh sửa thủ công sau.


export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
