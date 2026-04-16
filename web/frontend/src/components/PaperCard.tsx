import { useNavigate } from 'react-router-dom'
import { Paper } from '../types'
import { FileText, Calendar, Users } from 'lucide-react'

interface Props {
  paper: Paper
  onRemove?: (id: string) => void
}

export default function PaperCard({ paper, onRemove }: Props) {
  const navigate = useNavigate()

  return (
    <div
      className="card cursor-pointer group"
      onClick={() => navigate(`/paper/${encodeURIComponent(paper.id)}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-100 group-hover:text-blue-400 transition-colors line-clamp-2">
            {paper.title}
          </h3>
          {paper.authors?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-400">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {paper.journal && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {paper.journal}
              </span>
            )}
            {paper.year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {paper.year}
              </span>
            )}
          </div>
          {paper.keywords && paper.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {paper.keywords.slice(0, 5).map(kw => (
                <span key={kw} className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(paper.id) }}
            className="text-gray-600 hover:text-red-400 transition-colors p-1"
            title="Remove paper"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  )
}
