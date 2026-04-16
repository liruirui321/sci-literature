import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { Paper, KnowledgeGraph, ChatMessage, AppSettings, DEFAULT_SETTINGS } from '../types'

interface DataState {
  papers: Paper[]
  knowledgeGraph: KnowledgeGraph | null
  chatMessages: ChatMessage[]
  settings: AppSettings
  compareReport: string
  isLoading: boolean
}

type Action =
  | { type: 'SET_PAPERS'; payload: Paper[] }
  | { type: 'ADD_PAPERS'; payload: Paper[] }
  | { type: 'REMOVE_PAPER'; payload: string }
  | { type: 'SET_KG'; payload: KnowledgeGraph | null }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT' }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_COMPARE_REPORT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('sci-lit-settings')
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

const initialState: DataState = {
  papers: [],
  knowledgeGraph: null,
  chatMessages: [],
  settings: loadSettings(),
  compareReport: '',
  isLoading: false,
}

function reducer(state: DataState, action: Action): DataState {
  switch (action.type) {
    case 'SET_PAPERS':
      return { ...state, papers: action.payload }
    case 'ADD_PAPERS':
      return { ...state, papers: [...state.papers, ...action.payload] }
    case 'REMOVE_PAPER':
      return { ...state, papers: state.papers.filter(p => p.id !== action.payload) }
    case 'SET_KG':
      return { ...state, knowledgeGraph: action.payload }
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] }
    case 'CLEAR_CHAT':
      return { ...state, chatMessages: [] }
    case 'SET_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload }
      localStorage.setItem('sci-lit-settings', JSON.stringify(newSettings))
      return { ...state, settings: newSettings }
    }
    case 'SET_COMPARE_REPORT':
      return { ...state, compareReport: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

interface DataContextValue extends DataState {
  dispatch: React.Dispatch<Action>
  importPapersJsonl: (text: string) => void
  importKnowledgeGraph: (text: string) => void
  buildKGFromPapers: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const importPapersJsonl = useCallback((text: string) => {
    const lines = text.trim().split('\n').filter(Boolean)
    const papers: Paper[] = []
    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        const paper: Paper = {
          id: obj.id || obj.doi || `paper-${papers.length + 1}`,
          title: obj.title || 'Untitled',
          authors: obj.authors || [],
          ...obj,
        }
        papers.push(paper)
      } catch {
        // skip malformed lines
      }
    }
    dispatch({ type: 'SET_PAPERS', payload: papers })
  }, [])

  const importKnowledgeGraph = useCallback((text: string) => {
    try {
      const kg = JSON.parse(text)
      if (kg.nodes && kg.edges) {
        // Normalize nodes: ensure every node has a 'label' field
        const normalizedNodes: KnowledgeGraph['nodes'] = kg.nodes.map((n: Record<string, unknown>) => {
          const label = (n.label as string)
            || (n.title as string)
            || (n.name as string)
            || (n.content as string)
            || (n.id as string)
          // Map non-standard types to closest standard type
          let type = (n.type as string) || 'keyword'
          if (type === 'technique' || type === 'platform') type = 'method'
          return {
            id: n.id as string,
            label: label.length > 120 ? label.slice(0, 120) + '...' : label,
            type,
            properties: n,
          }
        })
        dispatch({ type: 'SET_KG', payload: { nodes: normalizedNodes, edges: kg.edges } })
      }
    } catch {
      // invalid JSON
    }
  }, [])

  const buildKGFromPapers = useCallback(() => {
    const nodes: KnowledgeGraph['nodes'] = []
    const edges: KnowledgeGraph['edges'] = []
    const nodeSet = new Set<string>()

    for (const paper of state.papers) {
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
        const kwId = `keyword:${kw.toLowerCase()}`
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
        nodeSet.add(fId)
        edges.push({ source: paperId, target: fId, relation: 'reports_finding' })
      }

      if (paper.limitations) {
        const lId = `limitation:${paper.id}`
        nodes.push({ id: lId, label: paper.limitations.slice(0, 80), type: 'limitation' })
        nodeSet.add(lId)
        edges.push({ source: paperId, target: lId, relation: 'has_limitation' })
      }
    }

    dispatch({ type: 'SET_KG', payload: { nodes, edges } })
  }, [state.papers])

  return (
    <DataContext.Provider value={{ ...state, dispatch, importPapersJsonl, importKnowledgeGraph, buildKGFromPapers }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
