import { useState, useEffect, useCallback } from 'react'
import { useData } from '../store/data'
import { extractTextFromPdf } from '../api/pdf'
import { callLLM } from '../api/client'
import {
  getAllFolders,
  getAllPapers,
  getPapersByFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  addPaper,
  deletePaper,
  updatePaper,
  getPapersRecursive,
  Folder,
  PaperFile,
} from '../api/paperLibrary'
import FolderTree from '../components/FolderTree'
import PaperCard from '../components/PaperCard'
import {
  Library as LibraryIcon,
  Upload,
  Loader2,
  Download,
  FolderPlus,
  AlertCircle,
  CheckCircle,
  FileText,
  Sparkles,
} from 'lucide-react'
import JSZip from 'jszip'

export default function Library() {
  const { settings, dispatch: globalDispatch } = useData()
  const [folders, setFolders] = useState<Folder[]>([])
  const [papers, setPapers] = useState<PaperFile[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root')
  const [currentPapers, setCurrentPapers] = useState<PaperFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; msg: string } | null>(null)

  const loadData = useCallback(async () => {
    const [f, p] = await Promise.all([getAllFolders(), getAllPapers()])
    setFolders(f)
    setPapers(p)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedFolderId) {
      getPapersByFolder(selectedFolderId).then(setCurrentPapers)
    }
  }, [selectedFolderId, papers])

  const handleCreateFolder = useCallback(async (parentId: string) => {
    const name = prompt('Folder name:')
    if (name?.trim()) {
      await createFolder(name.trim(), parentId)
      loadData()
    }
  }, [loadData])

  const handleRenameFolder = useCallback(async (id: string, newName: string) => {
    await renameFolder(id, newName)
    loadData()
  }, [loadData])

  const handleDeleteFolder = useCallback(async (id: string) => {
    if (confirm('Delete this folder and all its contents?')) {
      await deleteFolder(id)
      if (selectedFolderId === id) setSelectedFolderId('root')
      loadData()
    }
  }, [loadData, selectedFolderId])

  const handleUploadPDFs = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) return

    if (!settings.apiKey) {
      setStatus({ type: 'error', msg: 'Please configure an API key in Settings first.' })
      return
    }

    setUploading(true)
    setStatus(null)
    let successCount = 0

    for (const file of pdfFiles) {
      try {
        setStatus({ type: 'info', msg: `Processing ${file.name}...` })

        const text = await extractTextFromPdf(file)
        if (text.trim().length < 100) {
          throw new Error('Could not extract enough text')
        }

        const truncated = text.slice(0, 12000)
        const messages = [
          {
            role: 'system',
            content: `Extract paper metadata as JSON (no markdown): {"title": string, "authors": string[], "year": number|null, "journal": string|null, "abstract": string, "method": string, "findings": string, "limitations": string, "keywords": string[]}`,
          },
          { role: 'user', content: `Analyze:\n\n${truncated}` },
        ]

        const result = await callLLM(settings, messages)
        let jsonStr = result.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        const parsed = JSON.parse(jsonStr)

        const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })

        await addPaper({
          folderId: selectedFolderId,
          filename: file.name,
          title: parsed.title || file.name.replace('.pdf', ''),
          authors: parsed.authors || [],
          year: parsed.year,
          journal: parsed.journal,
          abstract: parsed.abstract,
          method: parsed.method,
          findings: parsed.findings,
          limitations: parsed.limitations,
          keywords: parsed.keywords || [],
          pdfBlob: blob,
          analyzedAt: Date.now(),
        })

        successCount++
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err)
      }
    }

    setStatus({ type: 'success', msg: `Successfully added ${successCount} of ${pdfFiles.length} papers` })
    setUploading(false)
    loadData()
  }, [settings, selectedFolderId, loadData])

  const handleDeletePaper = useCallback(async (id: string) => {
    await deletePaper(id)
    loadData()
  }, [loadData])

  const handleExportFolder = useCallback(async () => {
    const allPapers = await getPapersRecursive(selectedFolderId)
    if (allPapers.length === 0) {
      alert('No papers to export')
      return
    }

    const zip = new JSZip()
    const folder = folders.find(f => f.id === selectedFolderId)

    for (const paper of allPapers) {
      if (paper.pdfBlob) {
        zip.file(paper.filename, paper.pdfBlob)
      }
    }

    // Add metadata JSON
    const metadata = allPapers.map(p => ({
      filename: p.filename,
      title: p.title,
      authors: p.authors,
      year: p.year,
      journal: p.journal,
      doi: p.doi,
      abstract: p.abstract,
      method: p.method,
      findings: p.findings,
      limitations: p.limitations,
      keywords: p.keywords,
    }))
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${folder?.name || 'papers'}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedFolderId, folders])

  const handleBuildKG = useCallback(async () => {
    const allPapers = await getPapersRecursive(selectedFolderId)
    if (allPapers.length === 0) {
      alert('No papers in this folder')
      return
    }

    // Convert to global papers format and build KG
    const converted = allPapers.map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      year: p.year,
      journal: p.journal,
      doi: p.doi,
      abstract: p.abstract,
      method: p.method,
      findings: p.findings,
      limitations: p.limitations,
      keywords: p.keywords,
    }))

    globalDispatch({ type: 'SET_PAPERS', payload: converted })

    // Build KG from papers
    const nodes: any[] = []
    const edges: any[] = []
    const nodeSet = new Set<string>()

    for (const paper of converted) {
      const paperId = `paper:${paper.id}`
      if (!nodeSet.has(paperId)) {
        nodes.push({ id: paperId, label: paper.title, type: 'paper' })
        nodeSet.add(paperId)
      }

      for (const author of paper.authors || []) {
        const authorId = `author:${author}`
        if (!nodeSet.has(authorId)) {
          nodes.push({ id: authorId, label: author, type: 'author' })
          nodeSet.add(authorId)
        }
        edges.push({ source: authorId, target: paperId, relation: 'authored' })
      }

      for (const kw of paper.keywords || []) {
        const kwId = `keyword:${kw}`
        if (!nodeSet.has(kwId)) {
          nodes.push({ id: kwId, label: kw, type: 'keyword' })
          nodeSet.add(kwId)
        }
        edges.push({ source: paperId, target: kwId, relation: 'has_keyword' })
      }

      if (paper.method) {
        const mId = `method:${paper.method.slice(0, 60)}`
        if (!nodeSet.has(mId)) {
          nodes.push({ id: mId, label: paper.method.slice(0, 60), type: 'method' })
          nodeSet.add(mId)
        }
        edges.push({ source: paperId, target: mId, relation: 'uses_method' })
      }

      if (paper.findings) {
        const fId = `finding:${paper.id}`
        nodes.push({ id: fId, label: paper.findings.slice(0, 80), type: 'finding' })
        edges.push({ source: paperId, target: fId, relation: 'reports_finding' })
      }

      if (paper.limitations) {
        const lId = `limitation:${paper.id}`
        nodes.push({ id: lId, label: paper.limitations.slice(0, 80), type: 'limitation' })
        edges.push({ source: paperId, target: lId, relation: 'has_limitation' })
      }
    }

    globalDispatch({ type: 'SET_KG', payload: { nodes, edges } })
    setStatus({ type: 'success', msg: `Knowledge graph built from ${converted.length} papers. Go to Knowledge Graph page to view.` })
  }, [selectedFolderId, globalDispatch])

  return (
    <div className="h-[calc(100vh-3rem)] flex gap-4">
      {/* Left sidebar - folder tree */}
      <div className="w-64 bg-surface-800 border border-gray-700/50 rounded-xl p-3 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <LibraryIcon className="w-4 h-4" />
            Library
          </h2>
          <button
            onClick={() => handleCreateFolder('root')}
            className="p-1 hover:bg-surface-700 rounded"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FolderTree
            folders={folders}
            papers={papers}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {folders.find(f => f.id === selectedFolderId)?.name || 'Library'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {currentPapers.length} paper{currentPapers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBuildKG}
              disabled={currentPapers.length === 0}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Build Knowledge Graph
            </button>
            <button
              onClick={handleExportFolder}
              disabled={currentPapers.length === 0}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export ZIP
            </button>
          </div>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            if (e.dataTransfer.files.length > 0) handleUploadPDFs(e.dataTransfer.files)
          }}
          className="border-2 border-dashed border-blue-500/40 rounded-xl p-6 text-center hover:border-blue-400/60 transition-colors cursor-pointer bg-blue-500/5 mb-4"
        >
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={e => e.target.files && handleUploadPDFs(e.target.files)}
            className="hidden"
            id="upload-library-pdf"
            disabled={uploading}
          />
          <label htmlFor="upload-library-pdf" className="cursor-pointer">
            {uploading ? (
              <Loader2 className="w-8 h-8 mx-auto text-blue-400 mb-2 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mx-auto text-blue-400 mb-2" />
            )}
            <p className="text-sm text-white font-medium">
              {uploading ? 'Processing PDFs...' : 'Upload PDFs to this folder'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Drop files here or click to browse
            </p>
          </label>
        </div>

        {/* Status */}
        {status && (
          <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm mb-4 ${
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

        {/* Papers grid */}
        {currentPapers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-400">No papers in this folder</h3>
              <p className="text-sm text-gray-500 mt-1">Upload PDFs to get started</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPapers.map(paper => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onRemove={handleDeletePaper}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
