export type ExamImagePreprocessMode = 'ocr' | 'vision'

function clamp(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value
}

function getGray(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b)
}

function applyConvolution(imageData: ImageData, kernel: number[], factor = 1, bias = 0): ImageData {
  const { width, height } = imageData
  const src = imageData.data
  const dest = new Uint8ClampedArray(src.length)
  const size = Math.sqrt(kernel.length)
  const half = Math.floor(size / 2)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let ky = 0; ky < size; ky += 1) {
        for (let kx = 0; kx < size; kx += 1) {
          const ix = x + kx - half
          const iy = y + ky - half
          if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue
          const idx = (iy * width + ix) * 4
          sum += src[idx] * kernel[ky * size + kx]
        }
      }
      const destIdx = (y * width + x) * 4
      const value = clamp(Math.round(sum / factor + bias))
      dest[destIdx] = value
      dest[destIdx + 1] = value
      dest[destIdx + 2] = value
      dest[destIdx + 3] = src[destIdx + 3]
    }
  }

  return new ImageData(dest, width, height)
}

function grayscaleImage(imageData: ImageData): void {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = getGray(d[i]!, d[i + 1]!, d[i + 2]!)
    d[i] = gray
    d[i + 1] = gray
    d[i + 2] = gray
  }
}

function toBinary(imageData: ImageData, threshold = 128): Uint8ClampedArray {
  const { width, height, data } = imageData
  const binary = new Uint8ClampedArray(width * height)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    binary[j] = data[i] >= threshold ? 255 : 0
  }
  return binary
}

function adaptiveThreshold(imageData: ImageData, blockSize = 15, c = 10): void {
  const { width, height, data } = imageData
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    gray[j] = data[i]
  }

  const integral = new Uint32Array((width + 1) * (height + 1))
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0
    for (let x = 1; x <= width; x += 1) {
      rowSum += gray[(y - 1) * width + (x - 1)]
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum
    }
  }

  const half = Math.floor(blockSize / 2)
  for (let y = 0; y < height; y += 1) {
    const y1 = Math.max(0, y - half)
    const y2 = Math.min(height - 1, y + half)
    for (let x = 0; x < width; x += 1) {
      const x1 = Math.max(0, x - half)
      const x2 = Math.min(width - 1, x + half)
      const count = (y2 - y1 + 1) * (x2 - x1 + 1)
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] -
        integral[y1 * (width + 1) + (x2 + 1)] +
        integral[y1 * (width + 1) + x1]
      const idx = (y * width + x) * 4
      const mean = sum / count
      const value = gray[y * width + x] < mean - c ? 0 : 255
      data[idx] = value
      data[idx + 1] = value
      data[idx + 2] = value
    }
  }
}

function sharpenImage(imageData: ImageData): ImageData {
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  return applyConvolution(imageData, kernel, 1, 0)
}

function rotateCanvas(canvas: HTMLCanvasElement, angleRad: number): HTMLCanvasElement {
  const w = canvas.width
  const h = canvas.height
  const sin = Math.abs(Math.sin(angleRad))
  const cos = Math.abs(Math.cos(angleRad))
  const newW = Math.ceil(w * cos + h * sin)
  const newH = Math.ceil(w * sin + h * cos)
  const rotated = document.createElement('canvas')
  rotated.width = newW
  rotated.height = newH
  const ctx = rotated.getContext('2d')
  if (!ctx) return canvas
  ctx.translate(newW / 2, newH / 2)
  ctx.rotate(angleRad)
  ctx.drawImage(canvas, -w / 2, -h / 2)
  return rotated
}

function projectionVariance(binary: Uint8ClampedArray, width: number, height: number): number {
  const rows = new Float64Array(height)
  for (let y = 0; y < height; y += 1) {
    let sum = 0
    for (let x = 0; x < width; x += 1) {
      sum += binary[y * width + x] === 0 ? 1 : 0
    }
    rows[y] = sum
  }
  const mean = rows.reduce((acc, value) => acc + value, 0) / height
  return rows.reduce((acc, value) => acc + (value - mean) ** 2, 0)
}

function estimateDeskewAngle(imageData: ImageData): number {
  const width = imageData.width
  const height = imageData.height
  const binary = toBinary(imageData, 128)
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return 0
  const tempImageData = tempCtx.createImageData(width, height)
  for (let i = 0, j = 0; i < tempImageData.data.length; i += 4, j += 1) {
    const v = binary[j]
    tempImageData.data[i] = v
    tempImageData.data[i + 1] = v
    tempImageData.data[i + 2] = v
    tempImageData.data[i + 3] = 255
  }
  tempCtx.putImageData(tempImageData, 0, 0)

  let bestAngle = 0
  let bestScore = -Infinity
  for (let angle = -3; angle <= 3; angle += 0.5) {
    const rotated = rotateCanvas(tempCanvas, (angle * Math.PI) / 180)
    const rotatedCtx = rotated.getContext('2d')
    if (!rotatedCtx) continue
    const rd = rotatedCtx.getImageData(0, 0, rotated.width, rotated.height)
    const rbinary = toBinary(rd, 128)
    const score = projectionVariance(rbinary, rotated.width, rotated.height)
    if (score > bestScore) {
      bestScore = score
      bestAngle = angle
    }
  }
  return bestAngle
}

export async function preprocessExamImage(
  imageDataUrl: string,
  opts?: { maxWidth?: number; mode?: ExamImagePreprocessMode }
): Promise<string> {
  const mode: ExamImagePreprocessMode = opts?.mode ?? 'ocr'
  const maxW = opts?.maxWidth ?? (mode === 'vision' ? 2048 : 1800)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w < 1 || h < 1) {
          resolve(imageDataUrl)
          return
        }

        let scale = Math.min(1, maxW / w)
        if (mode === 'ocr' && w * scale < 1200) {
          scale = Math.min(2, 1200 / w)
        }

        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(w * scale))
        canvas.height = Math.max(1, Math.round(h * scale))
        const ctx = canvas.getContext('2d', { willReadFrequently: mode === 'ocr' })
        if (!ctx) {
          resolve(imageDataUrl)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        if (mode === 'vision') {
          resolve(canvas.toDataURL('image/jpeg', 0.92))
          return
        }

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        grayscaleImage(imageData)
        imageData = applyConvolution(imageData, [1, 2, 1, 2, 4, 2, 1, 2, 1], 16, 0)
        adaptiveThreshold(imageData, 15, 12)
        const deskewAngle = estimateDeskewAngle(imageData)
        if (Math.abs(deskewAngle) > 0.2) {
          canvas.width = Math.ceil(canvas.width * 1.1)
          canvas.height = Math.ceil(canvas.height * 1.1)
          const rotated = rotateCanvas(canvas, (deskewAngle * Math.PI) / 180)
          if (rotated.width > 0 && rotated.height > 0) {
            canvas.width = rotated.width
            canvas.height = rotated.height
            const rotatedCtx = canvas.getContext('2d', { willReadFrequently: true })
            if (rotatedCtx) {
              rotatedCtx.drawImage(rotated, 0, 0)
              imageData = rotatedCtx.getImageData(0, 0, canvas.width, canvas.height)
            }
          }
        }

        const sharpened = sharpenImage(imageData)
        ctx.putImageData(sharpened, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(imageDataUrl)
      }
    }
    img.onerror = () => reject(new Error('Không đọc được ảnh'))
    img.src = imageDataUrl
  })
}
