import { useState, useEffect } from 'react'
import { Folder, PaperFile } from '../api/paperLibrary'
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
} from 'lucide-react'

interface Props {
  folders: Folder[]
  papers: PaperFile[]
  selectedFolderId: string | null
  onSelectFolder: (id: string) => void
  onCreateFolder: (parentId: string) => void
  onRenameFolder: (id: string, newName: string) => void
  onDeleteFolder: (id: string) => void
}

interface TreeNode {
  folder: Folder
  children: TreeNode[]
  paperCount: number
}

function buildTree(folders: Folder[], papers: PaperFile[]): TreeNode[] {
  const folderMap = new Map<string, TreeNode>()
  const paperCounts = new Map<string, number>()

  // Count papers per folder
  papers.forEach(p => {
    paperCounts.set(p.folderId, (paperCounts.get(p.folderId) || 0) + 1)
  })

  // Create nodes
  folders.forEach(f => {
    folderMap.set(f.id, {
      folder: f,
      children: [],
      paperCount: paperCounts.get(f.id) || 0,
    })
  })

  // Build tree
  const roots: TreeNode[] = []
  folders.forEach(f => {
    const node = folderMap.get(f.id)!
    if (f.parentId === null) {
      roots.push(node)
    } else {
      const parent = folderMap.get(f.parentId)
      if (parent) parent.children.push(node)
    }
  })

  return roots
}

function FolderTreeNode({
  node,
  level,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  node: TreeNode
  level: number
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (parentId: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(level === 0)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(node.folder.name)
  const [menuOpen, setMenuOpen] = useState(false)

  const isSelected = selectedId === node.folder.id
  const hasChildren = node.children.length > 0

  const handleRename = () => {
    if (editName.trim() && editName !== node.folder.name) {
      onRename(node.folder.id, editName.trim())
    }
    setEditing(false)
    setMenuOpen(false)
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
          isSelected ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-surface-700/50 text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-surface-600 rounded"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <div
          onClick={() => onSelect(node.folder.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {expanded ? <FolderOpen className="w-4 h-4 shrink-0" /> : <FolderIcon className="w-4 h-4 shrink-0" />}
          {editing ? (
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setEditing(false); setEditName(node.folder.name) }
              }}
              className="flex-1 bg-surface-900 border border-blue-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate">{node.folder.name}</span>
          )}
          <span className="text-xs text-gray-500 ml-auto">{node.paperCount}</span>
        </div>

        {node.folder.id !== 'root' && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1 hover:bg-surface-600 rounded"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-surface-700 border border-gray-600 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                  <button
                    onClick={() => { onCreate(node.folder.id); setMenuOpen(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-600 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Subfolder
                  </button>
                  <button
                    onClick={() => { setEditing(true); setMenuOpen(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-surface-600 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rename
                  </button>
                  <button
                    onClick={() => { onDelete(node.folder.id); setMenuOpen(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.folder.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FolderTree({
  folders,
  papers,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const tree = buildTree(folders, papers)

  return (
    <div className="space-y-0.5">
      {tree.map(node => (
        <FolderTreeNode
          key={node.folder.id}
          node={node}
          level={0}
          selectedId={selectedFolderId}
          onSelect={onSelectFolder}
          onCreate={onCreateFolder}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
        />
      ))}
    </div>
  )
}
