import { useCallback, useRef, useState } from 'react'
import { Upload, Send, X } from 'lucide-react'
import { useChatStore } from '../store/chat'
import { useChatSender } from '../hooks/useChatSender'

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const maxDim = 2048
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85))
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function ImageTab() {
  const { imageBase64, setImageBase64 } = useChatStore()
  const { loading, send } = useChatSender()
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const b64 = await resizeImage(file)
    setImageBase64(b64)
  }, [setImageBase64])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleOpenDialog = async () => {
    const base64 = await window.electronAPI.openImage()
    if (!base64) return
    const response = await fetch(base64)
    const blob = await response.blob()
    const file = new File([blob], 'image.png', { type: blob.type })
    handleFile(file)
  }

  const handleSubmit = async () => {
    if (!imageBase64) return
    send('请解答图片中的数学题，给出详细的逐步推导过程', imageBase64)
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      {imageBase64 ? (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1">
            <img
              src={imageBase64}
              alt="Preview"
              className="w-full h-full object-contain rounded-lg border border-gray-800"
            />
            <button
              onClick={() => setImageBase64(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white"
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            <Send size={14} />
            提交图片
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={handleOpenDialog}
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-400/10' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <Upload size={28} className="text-gray-600 mb-3" />
          <p className="text-xs text-gray-500">点击选择图片或拖拽到此处</p>
          <p className="text-xs text-gray-600 mt-1">PNG / JPG / GIF / WebP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      )}
    </div>
  )
}
