import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useData } from '../store/data'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { ArrowLeft, FlaskConical, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react'

const tabs = [
  { key: 'method', label: 'Method', icon: FlaskConical },
  { key: 'findings', label: 'Findings', icon: Lightbulb },
  { key: 'limitations', label: 'Limitations', icon: AlertTriangle },
  { key: 'reproducibility', label: 'Reproducibility', icon: RefreshCw },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function PaperDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { papers } = useData()
  const [activeTab, setActiveTab] = useState<TabKey>('method')

  const paper = papers.find(p => p.id === decodeURIComponent(id || ''))

  if (!paper) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-gray-400">Paper not found</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Back to Dashboard
        </button>
      </div>
    )
  }

  const content = (paper[activeTab] as string) || `No ${activeTab} information available.`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="card">
        <h1 className="text-xl font-bold text-white leading-snug">{paper.title}</h1>
        {paper.authors?.length > 0 && (
          <p className="text-sm text-gray-400 mt-2">{paper.authors.join(', ')}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
          {paper.journal && <span>{paper.journal}</span>}
          {paper.year && <span>{paper.year}</span>}
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              DOI: {paper.doi}
            </a>
          )}
        </div>
        {paper.abstract && (
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Abstract</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{paper.abstract}</p>
          </div>
        )}
        {paper.keywords && paper.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {paper.keywords.map(kw => (
              <span key={kw} className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-gray-700/50">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="p-5">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  )
}
