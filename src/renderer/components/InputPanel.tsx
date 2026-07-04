import TextTab from './TextTab'
import ImageTab from './ImageTab'
import LatexTab from './LatexTab'
import { useChatStore } from '../store/chat'
import type { InputTab } from '../store/chat'

const tabs: { id: InputTab; label: string }[] = [
  { id: 'text', label: '文字' },
  { id: 'image', label: '图片' },
  { id: 'latex', label: 'LaTeX' }
]

export default function InputPanel() {
  const activeTab = useChatStore(s => s.activeTab)
  const setActiveTab = useChatStore(s => s.setActiveTab)

  return (
    <div className="w-[420px] shrink-0 border-r border-gray-800 flex flex-col">
      <div className="flex border-b border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'text' && <TextTab />}
        {activeTab === 'image' && <ImageTab />}
        {activeTab === 'latex' && <LatexTab />}
      </div>
    </div>
  )
}
