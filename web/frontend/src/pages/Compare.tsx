import { useState } from 'react'
import { useData } from '../store/data'
import { callLLM } from '../api/client'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { GitCompare, Loader2, AlertCircle } from 'lucide-react'

export default function Compare() {
  const { papers, settings, compareReport, dispatch } = useData()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [streamContent, setStreamContent] = useState('')

  const generate = async () => {
    if (papers.length < 2) {
      setError('Need at least 2 papers to compare.')
      return
    }
    if (!settings.apiKey) {
      setError('API key not configured. Go to Settings first.')
      return
    }

    setLoading(true)
    setError('')
    setStreamContent('')

    const paperSummaries = papers.map((p, i) =>
      `Paper ${i + 1}: "${p.title}"
Authors: ${p.authors?.join(', ') || 'N/A'}
Method: ${p.method || 'N/A'}
Findings: ${p.findings || 'N/A'}
Limitations: ${p.limitations || 'N/A'}`
    ).join('\n\n---\n\n')

    const messages = [
      {
        role: 'system',
        content: `You are a scientific literature comparison expert. Generate a detailed comparative analysis report in Markdown format. Include:
1. **Overview** — brief summary of each paper
2. **Methodology Comparison** — table comparing methods, datasets, metrics
3. **Key Findings** — agreements and disagreements across papers
4. **Strengths & Limitations** — comparative assessment
5. **Research Gaps** — identified gaps and future directions
6. **Recommendation** — which paper is strongest for which use case

Use tables, bullet points, and clear headings.`,
      },
      {
        role: 'user',
        content: `Compare these ${papers.length} papers:\n\n${paperSummaries}`,
      },
    ]

    try {
      const result = await callLLM(settings, messages, (chunk) => {
        setStreamContent(chunk)
      })
      dispatch({ type: 'SET_COMPARE_REPORT', payload: result })
      setStreamContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const displayContent = loading ? streamContent : compareReport

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-blue-400" />
            Compare Papers
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate a comparative analysis of {papers.length} loaded paper{papers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading || papers.length < 2}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {papers.length < 2 && !error && (
        <div className="text-center py-16">
          <GitCompare className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400">Load at least 2 papers</h3>
          <p className="text-sm text-gray-500 mt-1">Go to Dashboard to import papers first</p>
        </div>
      )}

      {displayContent && (
        <div className="card">
          <MarkdownRenderer content={displayContent} />
          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Streaming response...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
