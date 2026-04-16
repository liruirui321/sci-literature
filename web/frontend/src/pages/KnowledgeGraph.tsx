import { useState } from 'react'
import { useData } from '../store/data'
import ForceGraph from '../components/ForceGraph'
import UploadZone from '../components/UploadZone'
import { NODE_COLORS, KGNode } from '../types'
import { Network, Cpu, Info } from 'lucide-react'

const nodeTypes = ['paper', 'author', 'method', 'finding', 'limitation', 'keyword'] as const

export default function KnowledgeGraph() {
  const { knowledgeGraph, papers, importKnowledgeGraph, buildKGFromPapers } = useData()
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(nodeTypes))
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)

  const toggleType = (type: string) => {
    setVisibleTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-400" />
            Knowledge Graph
          </h1>
          {knowledgeGraph && (
            <p className="text-sm text-gray-400 mt-1">
              {knowledgeGraph.nodes.length} nodes &middot; {knowledgeGraph.edges.length} edges
            </p>
          )}
        </div>
        {papers.length > 0 && (
          <button onClick={buildKGFromPapers} className="btn-primary text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Build from Papers
          </button>
        )}
      </div>

      {!knowledgeGraph ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <Network className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-400">No knowledge graph loaded</h3>
            <p className="text-sm text-gray-500 mt-1">Import a graph file or build one from your papers</p>
          </div>
          <div className="w-full max-w-md">
            <UploadZone
              accept=".json"
              label="Import knowledge_graph.json"
              onFile={importKnowledgeGraph}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Graph area */}
          <div className="flex-1 card p-0 overflow-hidden">
            <ForceGraph
              graph={knowledgeGraph}
              visibleTypes={visibleTypes}
              onNodeClick={setSelectedNode}
            />
          </div>

          {/* Side panel */}
          <div className="w-64 space-y-4 shrink-0">
            {/* Filter panel */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Filter Nodes</h3>
              <div className="space-y-2">
                {nodeTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleTypes.has(type)}
                      onChange={() => toggleType(type)}
                      className="rounded border-gray-600 bg-surface-900 text-blue-500 focus:ring-blue-500/50"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[type] }}
                    />
                    <span className="text-sm text-gray-300 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Selected node info */}
            {selectedNode && (
              <div className="card">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-300">Selected Node</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span
                      className="ml-2 badge"
                      style={{ backgroundColor: NODE_COLORS[selectedNode.type] + '20', color: NODE_COLORS[selectedNode.type] }}
                    >
                      {selectedNode.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Label:</span>
                    <p className="text-gray-300 mt-0.5">{selectedNode.label}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="text-gray-400 text-xs mt-0.5 break-all">{selectedNode.id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
