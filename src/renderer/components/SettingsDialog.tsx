import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { providers } from '../api/registry'
import { useSettingsStore } from '../store/settings'

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { provider, apiKey, model, loaded, load, save } = useSettingsStore()
  const [form, setForm] = useState({ provider, apiKey, model })

  useEffect(() => {
    if (!loaded) load()
    else setForm({ provider, apiKey, model })
  }, [loaded, load, provider, apiKey, model])

  const currentProvider = providers.find(item => item.id === form.provider)

  const handleSave = () => {
    save(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[420px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold">API 设置</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-400" title="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">服务商</label>
            <select
              value={form.provider}
              onChange={event => {
                const selectedProvider = providers.find(item => item.id === event.target.value)
                setForm({ ...form, provider: event.target.value, model: selectedProvider?.models[0]?.id ?? '' })
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {providers.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">API Key</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={event => setForm({ ...form, apiKey: event.target.value })}
              placeholder="输入你的 API Key..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">模型</label>
            <select
              value={form.model}
              onChange={event => setForm({ ...form, model: event.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {currentProvider?.models.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg hover:bg-gray-800 text-gray-400"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
