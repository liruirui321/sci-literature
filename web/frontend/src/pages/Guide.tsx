import { BookOpen, FileText, Network, GitCompare, MessageSquare, Settings, Upload, Database, Library as LibraryIcon, Search } from 'lucide-react'

const sections = [
  {
    icon: LibraryIcon,
    title: 'Library - Organize Your Papers',
    color: 'text-blue-400',
    steps: [
      'Create folders to organize papers by topic (e.g., "Microbiome", "Structural Variation").',
      'Upload PDF files directly to folders — they are automatically analyzed with LLM and stored in browser IndexedDB.',
      'Right-click folders to rename, delete, or create subfolders.',
      'Click "Export ZIP" to download all PDFs and metadata from a folder.',
      'Click "Build Knowledge Graph" to generate a graph from papers in the current folder.',
      'All data persists across browser sessions — your library is saved locally.',
    ],
  },
  {
    icon: Search,
    title: 'Paper Finder - Search and Download',
    color: 'text-green-400',
    steps: [
      'Search by DOI (e.g., 10.1038/s41586-024-...) or paper title.',
      'For Open Access papers: click "Get PDF & Analyze" to auto-download, extract, and add to your library.',
      'For non-OA papers: click "Sci-Hub" to open in Sci-Hub for manual download.',
      'Click "Add Metadata" to save paper info without downloading the PDF.',
      'Requires API key configured in Settings for automatic analysis.',
    ],
  },
  {
    icon: FileText,
    title: 'Dashboard - Quick Upload (Legacy)',
    color: 'text-gray-400',
    steps: [
      'Upload PDF files or papers.jsonl for temporary analysis (not saved to Library).',
      'Click "Load Sample Data" to try with built-in microbiome research papers.',
      'Papers uploaded here are in-memory only and lost on page refresh.',
      'For persistent storage, use the Library page instead.',
    ],
  },
  {
    icon: Network,
    title: 'Knowledge Graph - Visualize Relationships',
    color: 'text-purple-400',
    steps: [
      'Upload a knowledge_graph.json file, or build one from Library/Dashboard papers.',
      'Supports node types: paper, author, method, finding, limitation, keyword.',
      'Scroll to zoom, drag background to pan, drag nodes to reposition.',
      'Click nodes to see details; use filters to show/hide node types.',
      'Auto-scales for large graphs (>30 nodes).',
    ],
    format: `knowledge_graph.json format:
{
  "nodes": [
    {"id":"paper_1","type":"paper","label":"Paper Title"},
    {"id":"author_1","type":"author","label":"Author Name"}
  ],
  "edges": [
    {"source":"author_1","target":"paper_1","relation":"authored"}
  ]
}`,
  },
  {
    icon: GitCompare,
    title: 'Compare - Generate Comparative Analysis',
    color: 'text-orange-400',
    steps: [
      'Load at least 2 papers from Dashboard or Library.',
      'Configure an LLM API key in Settings.',
      'Click "Generate Report" for comprehensive comparison: methodology, findings, strengths, limitations, research gaps.',
      'Report streams in real-time as LLM generates it.',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Ask - RAG-Powered Q&A',
    color: 'text-cyan-400',
    steps: [
      'Load papers and configure API key first.',
      'Ask questions about your papers — system finds relevant context automatically.',
      'Assistant cites specific papers and maintains chat history for follow-ups.',
      'Click suggested questions or use "Clear Chat" to start fresh.',
    ],
  },
  {
    icon: Settings,
    title: 'Settings - API Configuration',
    color: 'text-red-400',
    steps: [
      'Select LLM provider: OpenAI, DeepSeek, MiniMax, Zhipu GLM, Anthropic, or custom.',
      'Enter API key (stored locally in browser, never sent to our servers).',
      'For custom models, set Base URL and Model name.',
      '"Clear All Data" removes papers, graphs, and chat from browser memory (does NOT clear Library IndexedDB).',
    ],
  },
]

export default function Guide() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-400" />
          User Guide
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          How to use SCI Literature Deep-Read Analysis Toolkit
        </p>
      </div>

      {/* Quick start */}
      <div className="card border-blue-500/30 bg-blue-500/5">
        <h2 className="text-lg font-semibold text-blue-300 mb-3">Quick Start</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>Go to <strong>Settings</strong> and configure your LLM API key (e.g., OpenAI, DeepSeek).</li>
          <li>Go to <strong>Library</strong> (home page) and create folders to organize your papers.</li>
          <li>Upload PDF files to folders — they are auto-analyzed and stored persistently in your browser.</li>
          <li>Or use <strong>Paper Finder</strong> to search by DOI/title and download papers directly.</li>
          <li>Click <strong>"Build Knowledge Graph"</strong> in Library to visualize paper relationships.</li>
          <li>Use <strong>Compare</strong> to generate comparative analysis, or <strong>Ask</strong> to chat with your papers.</li>
        </ol>
      </div>

      {/* Feature sections */}
      {sections.map(({ icon: Icon, title, color, steps, format }) => (
        <div key={title} className="card">
          <h2 className={`text-lg font-semibold text-white flex items-center gap-2 mb-3`}>
            <Icon className={`w-5 h-5 ${color}`} />
            {title}
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {format && (
            <pre className="mt-3 p-3 bg-surface-900 rounded-lg text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
              {format}
            </pre>
          )}
        </div>
      ))}

      {/* Data formats reference */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-3">Data Storage & Privacy</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
          <li><strong>Library papers:</strong> Stored in browser IndexedDB with PDF blobs — persists across sessions, never sent to servers.</li>
          <li><strong>Dashboard papers:</strong> In-memory only — lost on page refresh.</li>
          <li><strong>API keys:</strong> Saved in localStorage, only sent to your chosen LLM provider.</li>
          <li><strong>Knowledge graphs & chat:</strong> In-memory, cleared on refresh.</li>
          <li>All processing happens in your browser — no data is uploaded to our servers.</li>
          <li>Export your Library as ZIP anytime to back up PDFs and metadata locally.</li>
        </ul>
      </div>
    </div>
  )
}
