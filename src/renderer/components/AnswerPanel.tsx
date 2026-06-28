import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Eraser, Square } from 'lucide-react'
import { useChatStore } from '../store/chat'

export default function AnswerPanel() {
  const { messages, loading, error, lastUsage, clearMessages, stopGeneration } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs text-gray-500">
          {messages.length > 0 ? `共 ${messages.length} 条消息` : '输入题目开始'}
        </span>
        {messages.length > 0 && (
          <div className="flex items-center gap-1">
            {loading && (
              <button
                onClick={stopGeneration}
                className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
                title="停止生成"
              >
                <Square size={14} fill="currentColor" />
              </button>
            )}
            <button
              onClick={clearMessages}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              title="清空对话"
            >
              <Eraser size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            在左侧输入数学题目，AI 将为你逐步解答
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600/20 text-blue-100 ml-8'
                  : 'bg-gray-900 border border-gray-800 mr-8'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-gray-950 [&_code]:text-gray-300 [&_p]:my-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.content || '...'}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            AI 正在思考...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Token usage */}
        {lastUsage && !loading && (
          <div className="flex items-center gap-3 text-[11px] text-gray-600 justify-end">
            <span>提示 {lastUsage.prompt_tokens}</span>
            <span>生成 {lastUsage.completion_tokens}</span>
            <span>总计 {lastUsage.total_tokens}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
