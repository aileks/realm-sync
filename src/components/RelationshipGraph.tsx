import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Id } from '../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';

type Node = {
  id: Id<'entities'>;
  name: string;
  type: EntityType;
};

type Edge = {
  source: Id<'entities'>;
  target: Id<'entities'>;
  label: string;
  factId: Id<'facts'>;
};

type RelationshipGraphProps = {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: Id<'entities'>) => void;
  className?: string;
};

const entityColors: Record<EntityType, string> = {
  character: 'oklch(0.6 0.17 197)',
  location: 'oklch(0.6 0.15 165)',
  item: 'oklch(0.7 0.16 55)',
  concept: 'oklch(0.6 0.2 300)',
  event: 'oklch(0.6 0.14 250)',
};

type SimulationNode = d3.SimulationNodeDatum & Node;
type SimulationLink = d3.SimulationLinkDatum<SimulationNode> & {
  label: string;
  factId: Id<'facts'>;
};

export function RelationshipGraph({
  nodes,
  edges,
  onNodeClick,
  className,
}: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const simulationNodes: SimulationNode[] = nodes.map((n) => ({ ...n }));
    const nodeMap = new Map(simulationNodes.map((n) => [n.id, n]));

    const simulationLinks: SimulationLink[] = edges
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        label: e.label,
        factId: e.factId,
      }))
      .filter((l) => l.source && l.target);

    const simulation = d3
      .forceSimulation(simulationNodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simulationLinks)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('class', 'fill-muted-foreground');

    const link = g
      .append('g')
      .attr('class', 'stroke-border')
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(simulationLinks)
      .join('line')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    const linkLabels = g
      .append('g')
      .attr('class', 'fill-muted-foreground')
      .selectAll('text')
      .data(simulationLinks)
      .join('text')
      .attr('font-size', 10)
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .text((d) => d.label.replace(/_/g, ' '));

    const drag = d3
      .drag<SVGGElement, SimulationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const node = g
      .append('g')
      .selectAll<SVGGElement, SimulationNode>('g')
      .data(simulationNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag);

    node
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d) => entityColors[d.type] ?? 'oklch(0.5 0 0)')
      .attr('class', 'stroke-border')
      .attr('stroke-width', 2);

    node
      .append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-family', 'var(--font-serif)')
      .attr('class', 'fill-foreground')
      .text((d) => d.name);

    node.on('click', (_event, d) => {
      onNodeClick?.(d.id);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimulationNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimulationNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimulationNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimulationNode).y ?? 0);

      linkLabels
        .attr('x', (d) => {
          const sx = (d.source as SimulationNode).x ?? 0;
          const tx = (d.target as SimulationNode).x ?? 0;
          return (sx + tx) / 2;
        })
        .attr('y', (d) => {
          const sy = (d.source as SimulationNode).y ?? 0;
          const ty = (d.target as SimulationNode).y ?? 0;
          return (sy + ty) / 2;
        });

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, onNodeClick]);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn('h-full w-full', className)}>
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  );
}
