import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { KnowledgeGraph, KGNode, KGEdge, NODE_COLORS } from '../types'

interface Props {
  graph: KnowledgeGraph
  visibleTypes: Set<string>
  onNodeClick?: (node: KGNode) => void
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: string
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  relation: string
}

export default function ForceGraph({ graph, visibleTypes, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)

  const render = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return

    const width = svg.clientWidth
    const height = svg.clientHeight

    // Filter nodes/edges by visible types
    const nodes: SimNode[] = graph.nodes
      .filter(n => visibleTypes.has(n.type))
      .map(n => ({ ...n }))

    const nodeIds = new Set(nodes.map(n => n.id))
    const links: SimLink[] = graph.edges
      .filter(e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
      .map(e => ({ ...e, source: e.source, target: e.target }))

    // Clear previous
    const sel = d3.select(svg)
    sel.selectAll('*').remove()

    const g = sel.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    sel.call(zoom)

    // Simulation
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))

    simRef.current = simulation

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)

    // Link labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .text(d => d.relation)
      .attr('font-size', '8px')
      .attr('fill', '#6b7280')
      .attr('text-anchor', 'middle')

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
      )

    // Node circles
    node.append('circle')
      .attr('r', d => d.type === 'paper' ? 12 : 8)
      .attr('fill', d => NODE_COLORS[d.type] || '#6b7280')
      .attr('stroke', d => d3.color(NODE_COLORS[d.type] || '#6b7280')?.brighter(0.5)?.toString() || '#999')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.85)

    // Node labels
    node.append('text')
      .text(d => d.label.length > 30 ? d.label.slice(0, 30) + '...' : d.label)
      .attr('dx', d => d.type === 'paper' ? 16 : 12)
      .attr('dy', '0.35em')
      .attr('font-size', d => d.type === 'paper' ? '11px' : '9px')
      .attr('fill', '#d1d5db')

    // Click handler
    node.on('click', (_event, d) => {
      if (onNodeClick) {
        onNodeClick({ id: d.id, label: d.label, type: d.type as KGNode['type'] })
      }
    })

    // Hover highlight
    node.on('mouseover', function (_event, d) {
      const connected = new Set<string>()
      links.forEach(l => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
        if (s === d.id) connected.add(t)
        if (t === d.id) connected.add(s)
      })
      connected.add(d.id)

      node.attr('opacity', n => connected.has(n.id) ? 1 : 0.15)
      link.attr('stroke-opacity', l => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
        return connected.has(s) && connected.has(t) ? 0.8 : 0.05
      })
    })
    .on('mouseout', () => {
      node.attr('opacity', 1)
      link.attr('stroke-opacity', 0.6)
    })

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)

      linkLabel
        .attr('x', d => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr('y', d => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [graph, visibleTypes, onNodeClick])

  useEffect(() => {
    const cleanup = render()
    return () => cleanup?.()
  }, [render])

  useEffect(() => {
    const handleResize = () => {
      if (simRef.current) {
        simRef.current.stop()
      }
      render()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [render])

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-surface-900 rounded-xl"
      style={{ minHeight: '500px' }}
    />
  )
}
