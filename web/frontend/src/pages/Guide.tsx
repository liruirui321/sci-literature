import { BookOpen, FileText, Network, GitCompare, MessageSquare, Settings, Upload, Database } from 'lucide-react'

const sections = [
  {
    icon: FileText,
    title: 'Dashboard - Papers Management',
    color: 'text-blue-400',
    steps: [
      'Click "Load Demo Data" to try with built-in sample papers.',
      'Or upload your own papers.jsonl file — each line is one JSON paper object with fields like title, authors, method, findings, limitations, keywords, etc.',
      'Click a paper card to see full details; use the X button to remove a paper.',
    ],
    format: `Each line in papers.jsonl should be a JSON object:
{"id":"p1","title":"...","authors":["A","B"],"method":"...","findings":"...","limitations":"...","keywords":["k1","k2"]}`,
  },
  {
    icon: Network,
    title: 'Knowledge Graph - Visualize Relationships',
    color: 'text-purple-400',
    steps: [
      'Upload a knowledge_graph.json file (nodes + edges), or click "Build from Papers" to auto-generate one from loaded papers.',
      'The graph supports nodes of type: paper, author, method, finding, limitation, keyword. Other types (technique, platform) are auto-mapped to method.',
      'Use the filter panel on the right to show/hide node types by category.',
      'Click a node to see its details; hover to highlight its connections.',
      'Drag nodes to rearrange; scroll to zoom in/out.',
    ],
    format: `knowledge_graph.json format:
{
  "nodes": [
    {"id":"paper_1","type":"paper","title":"Paper Title"},
    {"id":"author_1","type":"author","name":"Author Name"},
    {"id":"finding_1","type":"finding","content":"Key finding..."}
  ],
  "edges": [
    {"source":"author_1","target":"paper_1","relation":"authored"},
    {"source":"paper_1","target":"finding_1","relation":"has_finding"}
  ]
}
Node label is auto-resolved from: label > title > name > content > id`,
  },
  {
    icon: GitCompare,
    title: 'Compare - Generate Comparative Analysis',
    color: 'text-green-400',
    steps: [
      'Load at least 2 papers first from the Dashboard.',
      'Configure an LLM API key in Settings (supports OpenAI, DeepSeek, MiniMax, Zhipu, Anthropic, or custom).',
      'Click "Generate Report" to get a comprehensive comparison including methodology, findings, strengths, limitations, and research gaps.',
      'The report streams in real-time as the LLM generates it.',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Ask - RAG-Powered Q&A',
    color: 'text-cyan-400',
    steps: [
      'Load papers and configure an API key first.',
      'Type a question about your loaded papers — the system automatically finds relevant papers as context.',
      'The assistant cites specific papers and can answer follow-up questions using chat history.',
      'Click suggested questions for inspiration, or use "Clear Chat" to start fresh.',
    ],
  },
  {
    icon: Settings,
    title: 'Settings - API & Backend Configuration',
    color: 'text-orange-400',
    steps: [
      'Select an LLM provider and enter your API key (stored locally in browser, never sent to our servers).',
      'For custom/self-hosted models, set the Base URL and Model name manually.',
      'Optionally connect to a local FastAPI backend (python backend/main.py) for PDF upload and extraction.',
      '"Clear All Data" removes all loaded papers, graphs, and chat history from browser memory.',
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
          <li>Go to <strong>Dashboard</strong> and upload your <code className="text-blue-400">papers.jsonl</code> file, or click "Load Demo Data".</li>
          <li>Use <strong>Knowledge Graph</strong> to visualize paper relationships (upload <code className="text-blue-400">knowledge_graph.json</code> or build from papers).</li>
          <li>Use <strong>Compare</strong> to generate a detailed comparative report of your papers.</li>
          <li>Use <strong>Ask</strong> to chat with your papers using RAG-powered Q&A.</li>
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
        <h2 className="text-lg font-semibold text-white mb-3">Data Privacy</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
          <li>All data is processed in your browser — nothing is stored on any server.</li>
          <li>API keys are saved in localStorage and only sent to your chosen LLM provider.</li>
          <li>The Knowledge Graph and papers data exist only in browser memory and are lost on page refresh.</li>
          <li>The optional local backend runs on your own machine for PDF processing.</li>
        </ul>
      </div>
    </div>
  )
}
