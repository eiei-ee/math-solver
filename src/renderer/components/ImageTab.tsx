import { useCallback, useRef, useState } from 'react'
import { Send, Upload, X } from 'lucide-react'
import { getModel } from '../api/registry'
import { useChatSubmit } from '../hooks/useChatSubmit'
import { useChatStore } from '../store/chat'
import { useSettingsStore } from '../store/settings'

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('无法解析图片文件'))
    }

    img.onload = () => {
      try {
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
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法创建图片画布')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    img.src = objectUrl
  })
}

export default function ImageTab() {
  const { imageBase64, setImageBase64, setError } = useChatStore()
  const { loading, submitChat } = useChatSubmit()
  const settings = useSettingsStore()
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentModel = getModel(settings.provider, settings.model)
  const imageUnsupported = Boolean(currentModel && !currentModel.supportsImage)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      const b64 = await resizeImage(file)
      setImageBase64(b64)
      setError(null)
    } catch (error) {
      setError(`图片读取失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [setError, setImageBase64])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleOpenDialog = async () => {
    try {
      const path = await window.electronAPI.openImage()
      if (!path) return
      const response = await fetch(`file://${path}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const file = new File([blob], path.split(/[\\/]/).pop() || 'image.png', { type: blob.type })
      handleFile(file)
    } catch (error) {
      setError(`图片打开失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleSubmit = async () => {
    if (!imageBase64 || loading) return
    if (!settings.apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }
    if (imageUnsupported) {
      setError(`当前模型 ${currentModel?.label ?? settings.model} 不支持图片输入，请切换到视觉模型后重试`)
      return
    }

    const content = '请解答图片中的数学题，给出详细的逐步推导过程'
    await submitChat({
      content,
      requestContent: `${content}\n[图片已附在请求中]`,
      imageBase64
    })
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      {imageBase64 ? (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1">
            <img
              src={imageBase64}
              alt="题目预览"
              className="w-full h-full object-contain rounded-lg border border-gray-800"
            />
            <button
              onClick={() => setImageBase64(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white"
              title="移除图片"
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || imageUnsupported}
            className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            <Send size={14} />
            提交图片
          </button>
          {imageUnsupported && (
            <p className="mt-2 text-xs text-amber-400">
              当前模型不支持图片输入，请在设置中切换到视觉模型。
            </p>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={event => {
            event.preventDefault()
            setDragOver(true)
          }}
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
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>
      )}
    </div>
  )
}
