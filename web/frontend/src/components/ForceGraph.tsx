import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { KnowledgeGraph, KGNode, NODE_COLORS } from '../types'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!svg || !container) return

    // Stop previous simulation
    if (simRef.current) {
      simRef.current.stop()
      simRef.current = null
    }

    const width = container.clientWidth
    const height = container.clientHeight

    // Filter nodes/edges by visible types
    const nodes: SimNode[] = graph.nodes
      .filter(n => visibleTypes.has(n.type))
      .map(n => ({ ...n }))

    const nodeIds = new Set(nodes.map(n => n.id))
    const links: SimLink[] = graph.edges
      .filter(e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
      .map(e => ({ source: e.source, target: e.target, relation: e.relation }))

    // Clear previous
    const sel = d3.select(svg)
    sel.selectAll('*').remove()
    sel.attr('width', width).attr('height', height)

    const g = sel.append('g')

    // Zoom - shared behavior stored in ref so buttons can use it
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 10])
      .filter((event) => {
        // Allow wheel/dblclick always
        if (event.type === 'wheel' || event.type === 'dblclick') return true
        // For mousedown/touchstart: only pan if NOT on a node
        const target = event.target as Element
        if (target.closest('.graph-node')) return false
        return !event.ctrlKey && !event.button
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    zoomRef.current = zoom
    sel.call(zoom)

    // Set initial zoom to fit for large graphs
    if (nodes.length > 30) {
      const scale = Math.min(0.7, Math.sqrt(300 / nodes.length))
      const initTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-width / 2, -height / 2)
      sel.call(zoom.transform, initTransform)
    }

    // Simulation
    const chargeStrength = nodes.length > 50 ? -350 : -250
    const linkDist = nodes.length > 50 ? 120 : 90

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(linkDist))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(32))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))

    simRef.current = simulation

    // Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4)

    // Link labels
    const linkLabel = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .join('text')
      .text(d => d.relation)
      .attr('font-size', '7px')
      .attr('fill', '#9ca3af')
      .attr('text-anchor', 'middle')
      .attr('opacity', 0)
      .attr('pointer-events', 'none')

    // Node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'grab')

    // Node drag behavior
    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
        d3.select(event.sourceEvent.currentTarget as SVGGElement).style('cursor', 'grabbing')
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
        d3.select(event.sourceEvent.currentTarget as SVGGElement).style('cursor', 'grab')
      })

    node.call(drag)

    // Node circles
    const circleRadius = (d: SimNode) => d.type === 'paper' ? 14 : 8
    node.append('circle')
      .attr('r', circleRadius)
      .attr('fill', d => NODE_COLORS[d.type] || '#6b7280')
      .attr('stroke', d => {
        const c = d3.color(NODE_COLORS[d.type] || '#6b7280')
        return c ? c.brighter(0.8).toString() : '#999'
      })
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9)

    // Node labels - longer text, with text shadow for readability
    node.append('text')
      .text(d => {
        const maxLen = d.type === 'paper' ? 60 : 40
        return d.label.length > maxLen ? d.label.slice(0, maxLen) + '…' : d.label
      })
      .attr('dx', d => circleRadius(d) + 5)
      .attr('dy', '0.35em')
      .attr('font-size', d => d.type === 'paper' ? '11px' : '9.5px')
      .attr('font-weight', d => d.type === 'paper' ? '600' : '400')
      .attr('fill', '#e5e7eb')
      .attr('pointer-events', 'none')
      .style('paint-order', 'stroke')
      .style('stroke', 'rgba(15, 23, 42, 0.9)')
      .style('stroke-width', '3px')
      .style('stroke-linecap', 'round')
      .style('stroke-linejoin', 'round')

    // Click handler
    node.on('click', (event, d) => {
      event.stopPropagation()
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

      node.attr('opacity', n => connected.has(n.id) ? 1 : 0.1)
      link.attr('stroke-opacity', l => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
        return connected.has(s) && connected.has(t) ? 0.9 : 0.02
      })
      linkLabel.attr('opacity', l => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : String(l.source)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : String(l.target)
        return connected.has(s) && connected.has(t) ? 1 : 0
      })
    })
    .on('mouseout', () => {
      node.attr('opacity', 1)
      link.attr('stroke-opacity', 0.4)
      linkLabel.attr('opacity', 0)
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

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const svg = svgRef.current
      if (svg) {
        svg.setAttribute('width', String(container.clientWidth))
        svg.setAttribute('height', String(container.clientHeight))
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Zoom control helpers
  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    const zoom = zoomRef.current
    if (svg && zoom) {
      d3.select(svg).transition().duration(250).call(zoom.scaleBy, factor)
    }
  }

  const resetZoom = () => {
    const svg = svgRef.current
    const zoom = zoomRef.current
    if (svg && zoom) {
      d3.select(svg).transition().duration(400).call(zoom.transform, d3.zoomIdentity)
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '500px' }}>
      <svg
        ref={svgRef}
        className="absolute inset-0 bg-surface-900 rounded-xl"
        style={{ touchAction: 'none', cursor: 'grab' }}
      />
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
        <button
          type="button"
          onClick={() => zoomBy(1.5)}
          className="w-9 h-9 bg-surface-700/90 hover:bg-surface-600 text-gray-200 rounded-lg flex items-center justify-center text-xl font-bold backdrop-blur-sm border border-gray-600/50 transition-colors"
          title="Zoom In"
        >+</button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.5)}
          className="w-9 h-9 bg-surface-700/90 hover:bg-surface-600 text-gray-200 rounded-lg flex items-center justify-center text-xl font-bold backdrop-blur-sm border border-gray-600/50 transition-colors"
          title="Zoom Out"
        >−</button>
        <button
          type="button"
          onClick={resetZoom}
          className="w-9 h-9 bg-surface-700/90 hover:bg-surface-600 text-gray-200 rounded-lg flex items-center justify-center text-xs font-semibold backdrop-blur-sm border border-gray-600/50 transition-colors"
          title="Reset Zoom"
        >⟳</button>
      </div>
      {/* Interaction hint */}
      <div className="absolute top-3 left-3 text-xs text-gray-500 pointer-events-none select-none bg-surface-800/60 backdrop-blur-sm px-2 py-1 rounded">
        Scroll: zoom &middot; Drag bg: pan &middot; Drag node: move
      </div>
    </div>
  )
}
