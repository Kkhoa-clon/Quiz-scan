# QuizScan

Ứng dụng quét và xử lý đề thi trắc nghiệm từ ảnh.

## Cài đặt

```bash
npm install
```

## Chạy

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

## Cấu hình

### OCR API Token (thay thế Tesseract OCR)

Để sử dụng API OCR layout parsing thay vì Tesseract OCR:

1. Tạo file `.env` trong thư mục gốc dự án (copy từ `.env.example`)
2. Thêm token API của bạn:

```env
VITE_API_KEY=YOUR_API_KEY_HERE
```

3. Lấy token từ nhà cung cấp OCR mà dự án đang sử dụng.

Nếu không có token, ứng dụng sẽ báo lỗi và không chuyển ảnh thành văn bản.

### Ollama (tuỳ chọn)

Cài đặt [Ollama](https://ollama.ai/) để sử dụng AI cho chuẩn hóa văn bản và chấm đáp án.

```env
OLLAMA_HOST=http://127.0.0.1:11434
```

## Tính năng

- Quét ảnh đề thi trắc nghiệm
- Trích xuất văn bản bằng OCR API hoặc Ollama Vision
- Chuẩn hóa và tách câu hỏi
- Chấm đáp án với giải thích (nếu có Ollama)
- Lưu quiz để chơi lại

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
