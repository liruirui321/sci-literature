import { useState, useEffect } from 'react'
import { useData } from '../store/data'
import { checkBackend } from '../api/client'
import { Settings as SettingsIcon, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

const providers = [
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { value: 'minimax', label: 'MiniMax', baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7-highspeed' },
  { value: 'zhipu', label: 'Zhipu GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/', model: 'glm-4-plus' },
  { value: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  { value: 'custom', label: 'Custom', baseUrl: '', model: '' },
]

export default function Settings() {
  const { settings, dispatch } = useData()
  const [showKey, setShowKey] = useState(false)
  const [backendStatus, setBackendStatus] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)

  const update = (partial: Record<string, unknown>) => {
    dispatch({ type: 'SET_SETTINGS', payload: partial })
  }

  const selectProvider = (value: string) => {
    const p = providers.find(x => x.value === value)
    if (p) {
      update({
        apiProvider: p.value,
        apiBaseUrl: p.baseUrl || settings.apiBaseUrl,
        model: p.model || settings.model,
      })
    }
  }

  const testBackend = async () => {
    setTesting(true)
    const ok = await checkBackend(settings.backendUrl)
    setBackendStatus(ok)
    update({ useBackend: ok })
    setTesting(false)
  }

  useEffect(() => {
    testBackend()
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-400" />
          Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">Configure API access and backend connection</p>
      </div>

      {/* API Configuration */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">LLM API Configuration</h2>
        <p className="text-sm text-gray-400">
          Your API key is stored locally in your browser and never sent to our servers.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
          <select
            value={settings.apiProvider}
            onChange={e => selectProvider(e.target.value)}
            className="input"
          >
            {providers.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="input pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Base URL</label>
          <input
            type="text"
            value={settings.apiBaseUrl}
            onChange={e => update({ apiBaseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
          <input
            type="text"
            value={settings.model}
            onChange={e => update({ model: e.target.value })}
            placeholder="gpt-4o-mini"
            className="input"
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          {settings.apiKey ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">API key configured</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500">No API key — Compare & Ask features disabled</span>
            </>
          )}
        </div>
      </div>

      {/* Backend Configuration */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Local Backend (Optional)</h2>
        <p className="text-sm text-gray-400">
          Connect to a local FastAPI backend for PDF upload and extraction features.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Backend URL</label>
          <input
            type="text"
            value={settings.backendUrl}
            onChange={e => update({ backendUrl: e.target.value })}
            placeholder="http://localhost:8000"
            className="input"
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={testBackend} disabled={testing} className="btn-secondary text-sm">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {backendStatus !== null && (
            <div className="flex items-center gap-1.5 text-sm">
              {backendStatus ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">Not available (static-only mode)</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        <p className="text-sm text-gray-400">
          All data is stored in browser memory. Clearing will remove all loaded papers and graphs.
        </p>
        <button
          onClick={() => {
            dispatch({ type: 'SET_PAPERS', payload: [] })
            dispatch({ type: 'SET_KG', payload: null })
            dispatch({ type: 'SET_COMPARE_REPORT', payload: '' })
            dispatch({ type: 'CLEAR_CHAT' })
          }}
          className="btn-secondary text-sm text-red-400 border-red-500/20 hover:bg-red-500/10"
        >
          Clear All Data
        </button>
      </div>
    </div>
  )
}
