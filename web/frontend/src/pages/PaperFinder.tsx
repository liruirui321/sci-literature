import { useState, useCallback, useRef } from 'react'
import { searchPapers, PaperSearchResult, getSciHubUrl } from '../api/paperSearch'
import { extractTextFromPdf } from '../api/pdf'
import { callLLM } from '../api/client'
import { useData } from '../store/data'
import { Paper } from '../types'
import {
  Search,
  Loader2,
  Download,
  FileText,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  X,
  Globe,
} from 'lucide-react'

export default function PaperFinder() {
  const { settings, dispatch } = useData()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PaperSearchResult[]>([])
  const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; msg: string } | null>(null)
  const [processingDoi, setProcessingDoi] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setResults([])
    setStatus(null)
    try {
      const res = await searchPapers(q)
      setResults(res)
      if (res.length === 0) {
        setStatus({ type: 'info', msg: 'No papers found. Try a different search term or DOI.' })
      }
    } catch (err) {
      setStatus({ type: 'error', msg: `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setSearching(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // Download PDF → extract → LLM analyze → add as paper
  const handleDownloadAndAnalyze = useCallback(async (result: PaperSearchResult) => {
    if (!result.pdfUrl) return

    const id = result.doi || result.title
    setProcessingDoi(id)
    setStatus({ type: 'info', msg: `Downloading PDF for "${result.title.slice(0, 60)}..."` })

    try {
      // Download via our CORS proxy (direct fetch may fail due to CORS)
      let pdfBlob: Blob

      try {
        const res = await fetch(result.pdfUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        pdfBlob = await res.blob()
      } catch {
        // Try with allorigins proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(result.pdfUrl)}`
        const res = await fetch(proxyUrl)
        if (!res.ok) throw new Error('Download failed even with proxy')
        pdfBlob = await res.blob()
      }

      const pdfFile = new File([pdfBlob], `${result.doi || 'paper'}.pdf`, { type: 'application/pdf' })

      // Extract text
      setStatus({ type: 'info', msg: `Extracting text from PDF...` })
      const text = await extractTextFromPdf(pdfFile)

      if (text.trim().length < 100) {
        throw new Error('PDF text extraction returned too little text (may be scanned/image-only)')
      }

      // LLM analysis if API key is set
      let paper: Paper

      if (settings.apiKey) {
        setStatus({ type: 'info', msg: `Analyzing with LLM...` })
        const truncated = text.slice(0, 12000)
        const messages = [
          {
            role: 'system',
            content: `You are a scientific paper analyzer. Given the extracted text of a research paper, output ONLY a JSON object (no markdown, no code fences) with these fields:
- "title": string
- "authors": string[]
- "year": number or null
- "journal": string or null
- "abstract": string (first ~200 words if not found)
- "method": string (1-3 sentences)
- "findings": string (2-4 sentences)
- "limitations": string (1-3 sentences)
- "keywords": string[] (3-8 keywords)
Output ONLY valid JSON.`,
          },
          { role: 'user', content: `Analyze this paper:\n\n${truncated}` },
        ]
        const llmResult = await callLLM(settings, messages)
        let jsonStr = llmResult.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        const parsed = JSON.parse(jsonStr)
        paper = {
          id: `doi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title || result.title,
          authors: parsed.authors || result.authors,
          year: parsed.year || result.year,
          journal: parsed.journal || result.journal,
          doi: result.doi,
          abstract: parsed.abstract || result.abstract,
          method: parsed.method,
          findings: parsed.findings,
          limitations: parsed.limitations,
          keywords: parsed.keywords || [],
        }
      } else {
        // No API key — use metadata from search + raw text
        paper = {
          id: `doi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: result.title,
          authors: result.authors,
          year: result.year,
          journal: result.journal,
          doi: result.doi,
          abstract: result.abstract || text.slice(0, 500),
          keywords: [],
        }
      }

      dispatch({ type: 'ADD_PAPERS', payload: [paper] })
      setStatus({ type: 'success', msg: `"${paper.title}" added to your papers!` })
    } catch (err) {
      setStatus({ type: 'error', msg: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setProcessingDoi(null)
    }
  }, [settings, dispatch])

  // Add paper from metadata only (no PDF)
  const handleAddMetadata = useCallback((result: PaperSearchResult) => {
    const paper: Paper = {
      id: `meta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: result.title,
      authors: result.authors,
      year: result.year,
      journal: result.journal,
      doi: result.doi,
      abstract: result.abstract,
      keywords: [],
    }
    dispatch({ type: 'ADD_PAPERS', payload: [paper] })
    setStatus({ type: 'success', msg: `"${paper.title.slice(0, 50)}..." added (metadata only)` })
  }, [dispatch])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          Paper Finder
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Search by DOI or paper title &middot; Download Open Access PDFs &middot; Auto-analyze
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter DOI (e.g. 10.1038/s41586-024-...) or paper title..."
            className="input pl-10"
            disabled={searching}
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setStatus(null); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="btn-primary flex items-center gap-2"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Quick tips */}
      {results.length === 0 && !searching && !status && (
        <div className="card bg-surface-800/50 border-gray-700/30">
          <p className="text-sm text-gray-400 mb-3">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {[
              '10.1038/s41586-019-1238-8',
              'gut microbiome structural variation',
              'metagenome-wide association study BMI',
            ].map(example => (
              <button
                key={example}
                className="text-xs bg-surface-700/60 hover:bg-surface-600/60 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                onClick={() => { setQuery(example); inputRef.current?.focus() }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          status.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
        }`}>
          {status.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : status.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          }
          <span>{status.msg}</span>
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto text-blue-400 animate-spin mb-3" />
          <p className="text-sm text-gray-400">Searching Semantic Scholar...</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          {results.map((r, i) => {
            const id = r.doi || r.title
            const isProcessing = processingDoi === id
            return (
              <div key={i} className="card hover:border-gray-500/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm leading-snug">{r.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                      {r.authors.length > 0 && (
                        <span>{r.authors.slice(0, 3).join(', ')}{r.authors.length > 3 ? ' et al.' : ''}</span>
                      )}
                      {r.year && <span>{r.year}</span>}
                      {r.journal && <span className="text-gray-500">{r.journal}</span>}
                      {r.doi && (
                        <a
                          href={`https://doi.org/${r.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          {r.doi} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {r.abstract && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{r.abstract}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.openAccess && r.pdfUrl ? (
                      <button
                        onClick={() => handleDownloadAndAnalyze(r)}
                        disabled={isProcessing}
                        className="btn-primary text-xs flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {isProcessing
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                        {isProcessing ? 'Processing...' : 'Get PDF & Analyze'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 bg-surface-700/50 px-2 py-1 rounded flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        No Open Access
                      </span>
                    )}
                    {r.doi && (
                      <a
                        href={getSciHubUrl(r.doi)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs flex items-center gap-1.5 justify-center"
                        title="Try Sci-Hub (may require manual download)"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Sci-Hub
                      </a>
                    )}
                    <button
                      onClick={() => handleAddMetadata(r)}
                      className="btn-secondary text-xs"
                    >
                      Add Metadata
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
