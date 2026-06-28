import { useState } from 'react'
import { Send } from 'lucide-react'
import { useChatSender } from '../hooks/useChatSender'

export default function TextTab() {
  const [text, setText] = useState('')
  const { loading, send } = useChatSender()

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    send(trimmed)
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
        }}
        placeholder="输入数学题目... (Ctrl+Enter 发送)"
        className="flex-1 w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
      >
        <Send size={14} />
        发送
      </button>
    </div>
  )
}
