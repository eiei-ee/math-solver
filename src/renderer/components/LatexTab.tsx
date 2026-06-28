import { useEffect, useRef, useState } from 'react'
import { Send, Eye } from 'lucide-react'
import katex from 'katex'
import { useChatSender } from '../hooks/useChatSender'

export default function LatexTab() {
  const [latex, setLatex] = useState('')
  const { loading, send } = useChatSender()
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!previewRef.current) return
    try {
      const parts = latex.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g)
      const html = parts.map(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return katex.renderToString(part.slice(2, -2).trim(), { displayMode: true, throwOnError: false })
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return katex.renderToString(part.slice(1, -1).trim(), { throwOnError: false })
        }
        return `<span>${part}</span>`
      }).join('')
      previewRef.current.innerHTML = html
    } catch {
      // ignore render errors
    }
  }, [latex])

  const handleSubmit = () => {
    const trimmed = latex.trim()
    if (!trimmed) return
    setLatex('')
    send(trimmed)
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <textarea
        value={latex}
        onChange={e => setLatex(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
        }}
        placeholder={'输入 LaTeX 公式或题目...\n\n行内公式: $E=mc^2$\n独立公式: $$\\int_0^\\infty e^{-x} dx$$\n\nCtrl+Enter 发送'}
        className="flex-1 w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500 placeholder:text-gray-600 font-mono"
      />

      {latex && (
        <div className="mt-3 border border-gray-800 rounded-lg p-3 max-h-40 overflow-auto bg-gray-900/50">
          <div className="flex items-center gap-1.5 mb-2 text-gray-600">
            <Eye size={12} />
            <span className="text-[10px]">预览</span>
          </div>
          <div ref={previewRef} className="text-sm" />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !latex.trim()}
        className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
      >
        <Send size={14} />
        发送
      </button>
    </div>
  )
}
