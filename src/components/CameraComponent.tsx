import { useCallback, useRef, useState } from 'react'
import Webcam from 'react-webcam'

const videoConstraints: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

interface CameraComponentProps {
  onCapture: (dataUrl: string) => void
  onFiles: (files: FileList) => void
}

export function CameraComponent({ onCapture, onFiles }: CameraComponentProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')

  const capture = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot()
    if (shot) onCapture(shot)
  }, [onCapture])

  const flip = () => {
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-black shadow-md">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={{ ...videoConstraints, facingMode: facing }}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={flip}
          className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur"
        >
          Đổi camera
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={capture}
          className="rounded-2xl bg-[#3B82F6] py-3.5 font-semibold text-white shadow-md transition hover:bg-[#2563EB]"
        >
          Chụp ảnh
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-[#3B82F6] py-3.5 font-semibold text-[#3B82F6] transition hover:bg-[#EFF6FF]"
        >
          Tải ảnh
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fl = e.target.files
          if (fl?.length) onFiles(fl)
          e.target.value = ''
        }}
      />
      <p className="text-center text-xs text-gray-500">
        Chụp rõ đề, tránh bóng và mờ. Có thể chọn nhiều ảnh — app dùng ảnh đầu tiên để AI phân tích.
      </p>
    </div>
  )
}
