export interface Paper {
  id: string
  title: string
  authors: string[]
  journal?: string
  year?: number
  doi?: string
  abstract?: string
  sections?: Record<string, string>
  method?: string
  findings?: string
  limitations?: string
  reproducibility?: string
  keywords?: string[]
  citations_count?: number
  embedding?: number[]
  [key: string]: unknown
}

export interface KGNode {
  id: string
  label: string
  type: 'paper' | 'author' | 'method' | 'finding' | 'limitation' | 'keyword'
  properties?: Record<string, unknown>
}

export interface KGEdge {
  source: string
  target: string
  relation: string
  weight?: number
}

export interface KnowledgeGraph {
  nodes: KGNode[]
  edges: KGEdge[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  sources?: string[]
}

export interface AppSettings {
  apiProvider: string
  apiKey: string
  apiBaseUrl: string
  model: string
  backendUrl: string
  useBackend: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiProvider: 'openai',
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  backendUrl: 'http://localhost:8000',
  useBackend: false,
}

export const NODE_COLORS: Record<string, string> = {
  paper: '#3b82f6',
  author: '#22c55e',
  method: '#f97316',
  finding: '#a855f7',
  limitation: '#ef4444',
  keyword: '#06b6d4',
}
