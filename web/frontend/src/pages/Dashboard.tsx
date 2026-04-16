import { useState, useCallback } from 'react'
import { useData } from '../store/data'
import { callLLM } from '../api/client'
import { extractTextFromPdf } from '../api/pdf'
import { Paper } from '../types'
import PaperCard from '../components/PaperCard'
import UploadZone from '../components/UploadZone'
import { FileText, BookOpen, Loader2, Upload, AlertCircle, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const { papers, settings, dispatch, importPapersJsonl, importKnowledgeGraph } = useData()
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfStatus, setPdfStatus] = useState<{ type: 'error' | 'success'; msg: string } | null>(null)

  const loadBundledData = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.BASE_URL
      const [papersRes, kgRes] = await Promise.all([
        fetch(`${base}papers.jsonl`),
        fetch(`${base}knowledge_graph.json`),
      ])
      if (papersRes.ok) importPapersJsonl(await papersRes.text())
      if (kgRes.ok) importKnowledgeGraph(await kgRes.text())
    } catch { /* fetch failed */ }
    finally { setLoading(false) }
  }

  const handlePdfFiles = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) return

    if (!settings.apiKey) {
      setPdfStatus({ type: 'error', msg: 'Please configure an API key in Settings first. It is needed to analyze PDF content.' })
      return
    }

    setPdfLoading(true)
    setPdfStatus(null)
    const newPapers: Paper[] = []
    const errors: string[] = []

    for (const file of pdfFiles) {
      try {
        setPdfStatus({ type: 'success', msg: `Extracting text from "${file.name}"...` })
        const text = await extractTextFromPdf(file)

        if (text.trim().length < 100) {
          errors.push(`${file.name}: Could not extract enough text (scanned PDF?)`)
          continue
        }

        setPdfStatus({ type: 'success', msg: `Analyzing "${file.name}" with LLM...` })

        const truncated = text.slice(0, 12000) // Limit tokens sent to LLM
        const messages = [
          {
            role: 'system',
            content: `You are a scientific paper analyzer. Given the extracted text of a research paper, output ONLY a JSON object (no markdown, no code fences) with these fields:
- "title": string (paper title)
- "authors": string[] (author names)
- "year": number or null
- "journal": string or null
- "abstract": string (paper abstract, or first ~200 words if not found)
- "method": string (research methods used, 1-3 sentences)
- "findings": string (key findings, 2-4 sentences)
- "limitations": string (limitations mentioned, 1-3 sentences)
- "keywords": string[] (3-8 keywords)

Output ONLY valid JSON. No explanation.`,
          },
          {
            role: 'user',
            content: `Analyze this paper:\n\n${truncated}`,
          },
        ]

        const result = await callLLM(settings, messages)

        // Parse JSON from LLM response (handle code fences)
        let jsonStr = result.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        const parsed = JSON.parse(jsonStr)

        const paper: Paper = {
          id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title || file.name.replace('.pdf', ''),
          authors: parsed.authors || [],
          year: parsed.year || undefined,
          journal: parsed.journal || undefined,
          abstract: parsed.abstract || undefined,
          method: parsed.method || undefined,
          findings: parsed.findings || undefined,
          limitations: parsed.limitations || undefined,
          keywords: parsed.keywords || [],
        }
        newPapers.push(paper)
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Failed to process'}`)
      }
    }

    if (newPapers.length > 0) {
      dispatch({ type: 'ADD_PAPERS', payload: newPapers })
    }

    if (errors.length > 0) {
      setPdfStatus({ type: 'error', msg: errors.join('\n') })
    } else {
      setPdfStatus({ type: 'success', msg: `Successfully loaded ${newPapers.length} paper(s) from PDF` })
    }

    setPdfLoading(false)
  }, [settings, dispatch])

  const handlePdfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      handlePdfFiles(e.dataTransfer.files)
    }
  }, [handlePdfFiles])

  const handlePdfInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfFiles(e.target.files)
    }
    e.target.value = ''
  }, [handlePdfFiles])

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
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {loading ? 'Loading...' : 'Load Sample Data'}
        </button>
      </div>

      {/* PDF Upload Zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handlePdfDrop}
        className="border-2 border-dashed border-blue-500/40 rounded-xl p-8 text-center hover:border-blue-400/60 transition-colors cursor-pointer bg-blue-500/5"
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handlePdfInput}
          className="hidden"
          id="upload-pdf"
          disabled={pdfLoading}
        />
        <label htmlFor="upload-pdf" className="cursor-pointer">
          {pdfLoading ? (
            <Loader2 className="w-10 h-10 mx-auto text-blue-400 mb-3 animate-spin" />
          ) : (
            <Upload className="w-10 h-10 mx-auto text-blue-400 mb-3" />
          )}
          <p className="text-base text-white font-semibold">
            {pdfLoading ? 'Processing PDF...' : 'Upload PDF Papers'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Drop PDF files here or click to browse. Supports multiple files.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Requires API key in Settings — PDF text is extracted in browser, then analyzed by LLM
          </p>
        </label>
      </div>

      {/* Status message */}
      {pdfStatus && (
        <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          pdfStatus.type === 'error'
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-green-500/10 border border-green-500/20 text-green-400'
        }`}>
          {pdfStatus.type === 'error'
            ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          }
          <pre className="whitespace-pre-wrap">{pdfStatus.msg}</pre>
        </div>
      )}

      {/* JSONL Upload (secondary) */}
      <details className="group">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
          Advanced: Import papers.jsonl file
        </summary>
        <div className="mt-3">
          <UploadZone
            accept=".jsonl,.json,.txt"
            label="Import papers.jsonl"
            onFile={importPapersJsonl}
          />
        </div>
      </details>

      {papers.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No papers loaded</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload PDF files, or click "Load Sample Data" to try with example papers
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
