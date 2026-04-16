import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-100">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2 text-gray-100">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-gray-200">{children}</h3>,
        p: ({ children }) => <p className="mb-2 text-gray-300 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-gray-300">{children}</li>,
        code: ({ className, children }) => {
          const isBlock = className?.includes('language-')
          return isBlock ? (
            <pre className="bg-surface-900 rounded-lg p-3 my-2 overflow-x-auto">
              <code className="text-sm text-gray-300">{children}</code>
            </pre>
          ) : (
            <code className="bg-surface-900/50 px-1.5 py-0.5 rounded text-blue-400 text-sm">{children}</code>
          )
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-600 px-3 py-1.5 bg-surface-700 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="border border-gray-700 px-3 py-1.5">{children}</td>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 my-2 text-gray-400 italic">{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
