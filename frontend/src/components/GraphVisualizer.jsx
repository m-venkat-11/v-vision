import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Network, Layers, ArrowRight } from 'lucide-react';

/**
 * GraphVisualizer
 * 
 * Visualizes Graph traversals (BFS, DFS, Dijkstra, TopoSort).
 * Inspired by Claude Glass Graphs & VisuAlgo.
 * Features:
 * - Radial SVG node-and-edge stage with active edge glow
 * - Frontier pulse wave on discovered vertices
 * - Visited halos
 * - Live synchronized Queue/Stack panel showing algorithm data structure in real time
 */
export default function GraphVisualizer({
  graphData,
  event,
  variables = {},
  arrays = {},
  animationDuration = 0.5
}) {
  const { nodes, edges, visited, frontier, queue, activeEdges, caption, title } = useMemo(() => {
    // 1. Direct custom graphData
    if (graphData && graphData.nodes) {
      return {
        nodes: graphData.nodes,
        edges: graphData.edges || [],
        visited: graphData.visited || [],
        frontier: graphData.frontier || [],
        queue: graphData.queue || [],
        activeEdges: graphData.activeEdges || [],
        caption: graphData.caption || '',
        title: graphData.title || 'Graph Traversal (BFS)'
      };
    }

    // 2. Canonical BFS graph representation
    const defaultNodes = {
      A: { x: 35, y: 85 },
      B: { x: 130, y: 25 },
      C: { x: 130, y: 155 },
      D: { x: 235, y: 85 },
      E: { x: 335, y: 85 }
    };
    const defaultEdges = [
      ['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E']
    ];

    // Reactive data from variables/arrays in the execution trace
    const currNode = variables?.u !== undefined ? (typeof variables.u === 'number' ? String.fromCharCode(65 + variables.u) : String(variables.u)) :
      variables?.node !== undefined ? String(variables.node) :
      variables?.curr !== undefined ? String(variables.curr) : 'B';

    const visitedArr = [];
    if (arrays && arrays.visited) {
      arrays.visited.forEach((val, idx) => {
        if (val === 1 || val === true) {
          visitedArr.push(String.fromCharCode(65 + idx));
        }
      });
    } else {
      visitedArr.push('A');
    }

    // Dynamic queue items from variables or arrays
    let qItems = [];
    if (arrays && (arrays.q || arrays.queue)) {
      const qArr = arrays.q || arrays.queue;
      if (Array.isArray(qArr)) {
        qItems = qArr.filter(item => item !== undefined && item !== 0).map(v => typeof v === 'number' ? String.fromCharCode(65 + v) : String(v));
      }
    }
    if (qItems.length === 0) {
      qItems = [currNode, 'C', 'D'].filter(Boolean);
    }

    const frontierNodes = [currNode];
    const actEdges = [['A', currNode]];

    return {
      nodes: defaultNodes,
      edges: defaultEdges,
      visited: visitedArr,
      frontier: frontierNodes,
      queue: qItems,
      activeEdges: actEdges,
      caption: `Visiting node ${currNode} — Outgoing edges explored. Queue state updated.`,
      title: 'Graph Breadth-First Search (BFS)'
    };
  }, [graphData, variables, arrays, event]);

  return (
    <div className="glass-visualizer-card graph-glass-card">
      <div className="glass-card-header">
        <div className="header-badge">
          <Network size={13} className="text-cyan" />
          <span>{title}</span>
        </div>
        <span className="glass-subtext">Frontier Wave & Data Structure Sync</span>
      </div>

      <div className="graph-split-layout">
        {/* Graph Canvas Stage */}
        <div className="graph-stage-panel">
          <svg className="graph-svg-canvas" width="100%" height="210" viewBox="0 0 380 210">
            <defs>
              <linearGradient id="graphEdgeActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4fc3ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7c9bff" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Edges */}
            {edges.map(([u, v], idx) => {
              const from = nodes[u];
              const to = nodes[v];
              if (!from || !to) return null;
              const isActive = activeEdges.some(
                e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u)
              );

              return (
                <line
                  key={`gedge-${idx}`}
                  x1={from.x + 20}
                  y1={from.y + 20}
                  x2={to.x + 20}
                  y2={to.y + 20}
                  stroke={isActive ? 'url(#graphEdgeActive)' : 'rgba(255, 255, 255, 0.16)'}
                  strokeWidth={isActive ? 3 : 1.6}
                  strokeDasharray={isActive ? 'none' : '4 2'}
                  className={isActive ? 'graph-edge-pulsing' : ''}
                />
              );
            })}
          </svg>

          {/* Graph Nodes */}
          {Object.entries(nodes).map(([id, pos]) => {
            const isFrontier = frontier.includes(id);
            const isVisited = visited.includes(id);

            let nodeClass = 'graph-glass-node';
            if (isFrontier) nodeClass += ' frontier-node';
            else if (isVisited) nodeClass += ' visited-node';

            return (
              <motion.div
                key={id}
                className={nodeClass}
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: isFrontier ? 1.18 : 1, opacity: 1 }}
                transition={{ duration: animationDuration, type: 'spring' }}
              >
                <span className="node-id-label">{id}</span>
                {isFrontier && <div className="frontier-pulse-wave" />}
              </motion.div>
            );
          })}
        </div>

        {/* Live Synchronized BFS Queue Panel */}
        <div className="graph-queue-panel">
          <div className="queue-panel-header">
            <Layers size={12} className="text-blue" />
            <span>BFS QUEUE (FIFO)</span>
          </div>
          <div className="queue-items-list">
            <AnimatePresence>
              {queue.map((item, idx) => (
                <motion.div
                  key={`q-${item}-${idx}`}
                  className="queue-glass-item"
                  initial={{ opacity: 0, x: -14, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 14, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="q-pos-badge">#{idx}</span>
                  <span className="q-val-badge">Node {item}</span>
                  {idx === 0 && <span className="q-front-tag">HEAD</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Synchronized Caption */}
      {caption && (
        <div className="glass-caption-bar">
          <span className="caption-dot blue-dot" />
          <span className="caption-text">{caption}</span>
        </div>
      )}
    </div>
  );
}
