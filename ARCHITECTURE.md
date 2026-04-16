# Kiến trúc xử lý dự án QuizScan

## Luồng xử lý chính

```mermaid
flowchart TD
  A[ScanPage / CameraComponent] --> B[ProcessingScreen]
  B --> C[analyzeQuizImage(imageDataUrl, options)]
  C --> D{usePreprocess?}
  D -->|yes| PP[preprocessExamImage local<br/>{mode: 'ocr'}]
  D -->|no| F[raw imageDataUrl]
  PP --> F
  F --> G[POST /api/ocr/extract<br/>Blob + auth token]
  G --> H[server/ocrProxy.ts:<br/>sharp resize/optimize +<br/>AiStudio API layout parsing]
  H --> I[raw examText]
  I --> KK{refineTextWithOllama && ollamaModel?}
  KK -->|yes| LL[refineExamTextWithOllama<br/>(ollamaModel, examText)]
  KK -->|no| MM[raw examText]
  LL --> O[text for structure/parse]
  MM --> O
  O --> OO{aiStructureExam && ollamaModel?}
  OO -->|yes| P[structureExamWithOllama<br/>(ollamaModel, text)<br/>fallback parseExamTextToQuiz]
  OO -->|no| Q[parseExamTextToQuiz<br/>(normalizeForParse + regex)]
  P --> R[parsed payload]
  Q --> R
  R --> S{ollamaAnswerEnabled && ollamaModel?}
  S -->|yes| T[enrichPayloadWithOllama<br/>(ollamaModel, payload)]
  S -->|no| U[return payload]
  T --> U

```

## Giải thích từng bước

1. `ScanPage`
   - Người dùng chụp ảnh hoặc tải ảnh lên.
   - Ảnh được chuyển thành `dataURL` và gửi qua `ProcessingScreen`.

2. `ProcessingScreen`
   - Gọi `analyzeQuizImage` với các tuỳ chọn trạng thái UI.
   - Hiển thị progress/status trong quá trình xử lý.

3. `analyzeQuizImage`
   - Tuỳ chọn `usePreprocess`: local `preprocessExamImage({mode: 'ocr'})` — grayscale, adaptive threshold, sharpen, deskew, convolution smooth/noise.
   - POST image Blob to `/api/ocr/extract` (vite proxy → server/ocrProxy.ts).
   - Server: sharp resize(1800w)/jpeg90% → AiStudio layout parsing API (server `API_KEY`).

4. Server OCR proxy (`server/ocrProxy.ts`)
   - Auth client: fixed 'quizscan-local-token-change-in-prod'.
   - Sharp optimize trước API call.
   - Trả `{examText}` từ `result.layoutParsingResults[].markdown.text`.

5. OCR result
   - Raw `examText` string về client (no client API key exposure).


6. Post-OCR AI refine (optional)
   - Nếu `refineTextWithOllama` + `ollamaModel`: `refineExamTextWithOllama(model, rawExamText)` — sửa lỗi OCR/chính tả, format (chunk nếu dài >7k chars).

7. Parse/structure
   - Nếu `aiStructureExam` + `ollamaModel`: `structureExamWithOllama(model, refinedExamText)` — JSON {title, questions[] {question,A,B,C,D}}.
     - Split blocks heuristic (`roughSplitExamBlocks`/`numberSplitExamBlocks`), prompt từng segment/forced multi-q nếu ít câu.
     - Fallback `parseExamTextToQuiz` nếu JSON fail.
   - Else: `parseExamTextToQuiz(raw/refinedText)` — `normalizeForParse` (remove artifacts, fix "Cau"→"Câu"), split blocks regex/scan, parseBlock per question.


8. Chấm đáp án (tùy chọn)
   - Nếu `ollamaAnswerEnabled` bật và có model Ollama, dùng `enrichPayloadWithOllama` để chấm và bổ sung giải thích.
   - Nếu không, trả về payload đã tách câu.

## Các file liên quan chính

- `src/components/ScanPage.tsx`
- `src/components/ProcessingScreen.tsx`
- `src/lib/analyzeQuizImage.ts`
- `src/lib/ollamaClient.ts`
- `src/lib/imagePreprocess.ts`
- `src/lib/parseExamFromOcr.ts`
- `src/lib/aistudioOcr.ts` (deprecated)
- `server/ocrProxy.ts` (proxy + sharp + AiStudio)

## Gợi ý tối ưu

1. **Tách nhiệm rõ ràng hơn giữa OCR và AI**
   - Hiện tại OCR API chỉ dùng để nhận dạng văn bản.
   - Ollama chỉ nên dùng cho phần "sửa/chuẩn hóa" và "chấm đáp án".

2. **Xử lý lỗi OCR API tốt hơn**
   - Bổ sung retry/backoff khi gọi API.
   - Nếu API trả lỗi, có thể hiển thị thông báo hướng dẫn cho người dùng.
   - Tránh phụ thuộc vào các phương pháp cũ nếu API là nguồn chính.

3. **Cải thiện preprocessing**
   - `imagePreprocess` nên bao gồm: chống nhiễu, tăng tương phản, chuyển ảnh sang grayscale, deskew và sharpen.
   - Điều này giúp OCR tổng thể nhận dạng tốt hơn, đặc biệt với ảnh chụp méo/thiếu sáng.

4. **Giảm thiểu payload gửi lên API**
   - Nếu ảnh quá lớn, nén kỹ hơn hoặc giới hạn kích thước ảnh để giảm latency.
   - Kiểm tra kích thước ảnh trước khi gửi và chỉ nén khi cần.

5. **Server `API_KEY` env**
   - OCR API key ở server-side `process.env.API_KEY` (no client exposure).
   - Client auth proxy via fixed header token.

6. **Cache kết quả OCR**
   - Nếu người dùng xử lý lại cùng một ảnh, có thể cache `examText` tạm thời.
   - Giảm chi phí API và tăng tốc.

7. **Tối ưu UI progress**
   - Hiện trạng progress là ước lượng phần trăm.
   - Có thể thêm trạng thái riêng: `Đang gửi ảnh`, `Đang nhận văn bản`, `Đang xử lý AI`, `Hoàn tất`.

8. **Giảm thiểu phụ thuộc không cần thiết**
   - Giữ lại logic fallback OCR nhưng tách rõ ràng: OCR API là chính, các giải pháp khác là fallback.
   - Không để UI/logic nhầm lẫn giữa các nguồn OCR.

9. **Tối ưu parse regex/AI**
   - Nếu `aiStructureExam` thất bại, giữ lại kết quả regex ổn định.
   - Thêm validation nội bộ để phát hiện nếu AI trả câu/khoảng trắng bất thường.

10. **Kiểm tra response OCR API**
   - Nên validate `result.layoutParsingResults` trước khi dùng.
   - Thêm kiểm tra nếu API không trả markdown hoặc trả dữ liệu không đúng cấu trúc để debug dễ hơn.

## Tóm tắt hiện tại

- Ảnh: `ScanPage -> ProcessingScreen`
- Ảnh: `ScanPage -> ProcessingScreen`
- Optional local preprocess -> POST Blob `/api/ocr/extract` (server proxy + AiStudio `API_KEY`)
- Refine Ollama (opt) on raw examText
- Structure AI (opt, fallback regex+norm) -> payload
- Enrich/score Ollama (opt)

Nếu bạn muốn, tôi có thể tiếp tục cập nhật `README.md` thêm sơ đồ này và phần tối ưu hóa trực tiếp trong file hiện có.