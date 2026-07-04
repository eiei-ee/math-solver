import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, Eraser, RotateCcw, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { useChatSubmit } from '../hooks/useChatSubmit'
import { useChatStore } from '../store/chat'
import type { ChatMessage } from '../store/chat'

function buildMarkdown(messages: ChatMessage[]): string {
  const sections = messages.map((message, index) => {
    const speaker = message.role === 'user' ? '题目' : '解答'
    return `## ${index + 1}. ${speaker}\n\n${message.content.trim() || '...'}`
  })

  return [
    '# 数学题解答助手对话',
    '',
    `导出时间：${new Date().toLocaleString()}`,
    '',
    ...sections
  ].join('\n')
}

function findLatestUserIndex(messages: ChatMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return index
  }
  return -1
}

export default function AnswerPanel() {
  const { messages, loading, error, clearMessages, setLoading, setMessages, setError } = useChatStore()
  const { submitChat } = useChatSubmit()
  const [status, setStatus] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const latestAssistant = useMemo(
    () => [...messages].reverse().find(message => message.role === 'assistant' && message.content.trim()),
    [messages]
  )
  const latestUserIndex = useMemo(
    () => findLatestUserIndex(messages),
    [messages]
  )
  const canRegenerate = latestUserIndex >= 0 && !loading

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), 1800)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleCancel = async () => {
    await window.electronAPI.cancelChat()
    setLoading(false)
  }

  const handleCopy = async () => {
    if (!latestAssistant) return
    try {
      await navigator.clipboard.writeText(latestAssistant.content)
      setStatus('已复制最新解答')
    } catch (copyError) {
      setError(`复制失败: ${copyError instanceof Error ? copyError.message : String(copyError)}`)
    }
  }

  const handleExport = async () => {
    if (messages.length === 0) return
    try {
      const path = await window.electronAPI.saveMarkdown(buildMarkdown(messages))
      if (path) setStatus('已导出 Markdown')
    } catch (exportError) {
      setError(`导出失败: ${exportError instanceof Error ? exportError.message : String(exportError)}`)
    }
  }

  const handleRegenerate = async () => {
    if (!canRegenerate) return
    const history = messages.slice(0, latestUserIndex + 1)
    const lastUser = history[history.length - 1]
    setMessages(history)
    await submitChat({
      content: lastUser.content,
      appendUser: false,
      messagesOverride: history
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs text-gray-500">
          {messages.length > 0 ? `共 ${messages.length} 条消息` : '输入题目开始'}
        </span>
        <div className="flex items-center gap-1">
          {loading && (
            <button
              onClick={handleCancel}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              title="停止生成"
            >
              <Square size={14} />
            </button>
          )}
          {latestAssistant && (
            <button
              onClick={handleCopy}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="复制最新解答"
            >
              <Copy size={14} />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="导出 Markdown"
            >
              <Download size={14} />
            </button>
          )}
          {canRegenerate && (
            <button
              onClick={handleRegenerate}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              title="重新生成上一题"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              disabled={loading}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title={loading ? '回答生成中，暂不能清空' : '清空对话'}
            >
              <Eraser size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            在左侧输入数学题目，AI 将为你逐步解答
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'flex justify-end' : ''}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600/20 text-blue-100 ml-8'
                  : 'bg-gray-900 border border-gray-800 mr-8'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-gray-950 [&_code]:text-gray-300 [&_p]:my-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {message.content || '...'}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            AI 正在思考...
          </div>
        )}

        {status && (
          <div className="bg-emerald-900/25 border border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-300">
            {status}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
