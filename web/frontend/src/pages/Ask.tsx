import { useState, useRef, useEffect } from 'react'
import { useData } from '../store/data'
import { callLLM, cosineSimilarity } from '../api/client'
import ChatMessageComp from '../components/ChatMessage'
import { ChatMessage } from '../types'
import { Send, Loader2, Trash2, AlertCircle, MessageSquare } from 'lucide-react'

export default function Ask() {
  const { papers, settings, chatMessages, dispatch } = useData()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const findRelevantPapers = (query: string, topK = 3) => {
    // Simple keyword-based relevance if no embeddings
    const queryWords = query.toLowerCase().split(/\s+/)
    const scored = papers.map(p => {
      const text = [
        p.title,
        p.abstract,
        p.method,
        p.findings,
        p.limitations,
        ...(p.keywords || []),
      ].filter(Boolean).join(' ').toLowerCase()

      let score = 0
      for (const w of queryWords) {
        if (w.length > 2 && text.includes(w)) score++
      }
      return { paper: p, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK).filter(s => s.score > 0).map(s => s.paper)
  }

  const send = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    if (!settings.apiKey) {
      setError('API key not configured. Go to Settings first.')
      return
    }

    setError('')
    setInput('')

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg })

    setLoading(true)

    try {
      const relevant = findRelevantPapers(trimmed)
      const context = relevant.length > 0
        ? relevant.map((p, i) =>
            `[Paper ${i + 1}] "${p.title}"
Method: ${p.method || 'N/A'}
Findings: ${p.findings || 'N/A'}
Limitations: ${p.limitations || 'N/A'}`
          ).join('\n\n')
        : 'No relevant papers found in the loaded dataset.'

      const messages = [
        {
          role: 'system',
          content: `You are a scientific literature assistant. Answer questions based on the provided paper context. Cite papers by their title. If the context doesn't contain enough information, say so honestly.

Context from loaded papers:
${context}`,
        },
        // Include recent chat history
        ...chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ]

      const result = await callLLM(settings, messages)

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
        sources: relevant.map(p => p.title),
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: assistantMsg })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center justify-between shrink-0 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Ask Questions
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            RAG-powered Q&A over {papers.length} loaded paper{papers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {chatMessages.length > 0 && (
          <button
            onClick={() => dispatch({ type: 'CLEAR_CHAT' })}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {chatMessages.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-400">Start a conversation</h3>
            <p className="text-sm text-gray-500 mt-1">
              Ask questions about your loaded papers
            </p>
            {papers.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-xs text-gray-500">Try asking:</p>
                {[
                  'What methods are used across these papers?',
                  'What are the main findings?',
                  'What research gaps exist?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="block mx-auto text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {chatMessages.map(msg => (
          <ChatMessageComp key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4 border-t border-gray-700/50">
        <form
          onSubmit={e => { e.preventDefault(); send() }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={papers.length === 0 ? 'Load papers first...' : 'Ask about your papers...'}
            disabled={papers.length === 0}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || papers.length === 0}
            className="btn-primary px-4"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
