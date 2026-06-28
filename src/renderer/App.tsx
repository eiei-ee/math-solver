import { useEffect, useState } from 'react'
import InputPanel from './components/InputPanel'
import AnswerPanel from './components/AnswerPanel'
import SettingsDialog from './components/SettingsDialog'
import { useSettingsStore } from './store/settings'
import { Settings } from 'lucide-react'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const loadSettings = useSettingsStore(s => s.load)

  useEffect(() => { loadSettings() }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <header className="h-12 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-sm font-medium text-gray-300">数学题解答助手</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <InputPanel />
        <AnswerPanel />
      </div>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  )
}
