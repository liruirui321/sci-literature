import { useState } from 'react'
import { useData } from '../store/data'
import PaperCard from '../components/PaperCard'
import UploadZone from '../components/UploadZone'
import { FileText, Database, BookOpen, Loader2 } from 'lucide-react'

export default function Dashboard() {
  const { papers, dispatch, importPapersJsonl, importKnowledgeGraph } = useData()
  const [loading, setLoading] = useState(false)

  const loadBundledData = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.BASE_URL
      const [papersRes, kgRes] = await Promise.all([
        fetch(`${base}papers.jsonl`),
        fetch(`${base}knowledge_graph.json`),
      ])
      if (papersRes.ok) {
        const text = await papersRes.text()
        importPapersJsonl(text)
      }
      if (kgRes.ok) {
        const text = await kgRes.text()
        importKnowledgeGraph(text)
      }
    } catch {
      // fetch failed
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
        <button
          onClick={loadBundledData}
          disabled={loading}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {loading ? 'Loading...' : 'Load Sample Data'}
        </button>
      </div>

      <UploadZone
        accept=".jsonl,.json,.txt"
        label="Import papers.jsonl"
        onFile={importPapersJsonl}
      />

      {papers.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No papers loaded</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload a papers.jsonl file or load demo data to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map(paper => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onRemove={id => dispatch({ type: 'REMOVE_PAPER', payload: id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
