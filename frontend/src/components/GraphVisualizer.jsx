import { Network } from 'lucide-react';
import { useMemo } from 'react';

/**
 * GraphVisualizer — Ground-up rewrite based on Reference 4 (Graphs BFS)
 *
 * Exact patterns from reference:
 *   - .gnode default:  rgba(255,255,255,.06) bg, 1.5px white/15% border, 46×46 circle
 *   - .gnode.frontier: blue glow ring (0 0 0 1px #4fc3ff, 0 0 28px #4fc3ff) + pulse animation
 *   - .gnode.visited:  green border, opacity .75, green gradient BG (dimmed)
 *   - SVG edges:       default rgba(255,255,255,.15) 2px stroke  
 *                      active: #4fc3ff stroke, 3px, drop-shadow glow
 *   - Queue panel:     side panel with .qitem entries that slideIn from left (qIn animation)
 *   - Layout:          display:flex, graph stage (flex:2) + queue panel (200px)
 *
 * @keyframes pulse (reference exact):
 *   0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)}
 *
 * @keyframes qIn (reference exact):
 *   0%{opacity:0;transform:translateX(-10px) scale(.8)} 100%{opacity:1;transform:translateX(0) scale(1)}
 */
export default function GraphVisualizer({ graphData, event, variables = {}, arrays = {} }) {
  const { nodes, edges, visited, frontier, queue, activeEdges, caption, title } = useMemo(() => {
    if (graphData?.nodes) {
      return {
        nodes:       graphData.nodes,
        edges:       graphData.edges       || [],
        visited:     graphData.visited     || [],
        frontier:    graphData.frontier    || [],
        queue:       graphData.queue       || [],
        activeEdges: graphData.activeEdges || [],
        caption:     graphData.caption     || '',
        title:       graphData.title       || 'Graph BFS'
      };
    }

    // Default canonical BFS demo — matches reference node positions exactly
    const defaultNodes = {
      A: { x: 40,  y: 110 },
      B: { x: 150, y: 30  },
      C: { x: 150, y: 190 },
      D: { x: 270, y: 110 },
      E: { x: 390, y: 110 }
    };
    const defaultEdges = [['A','B'],['A','C'],['B','D'],['C','D'],['D','E']];

    // Map variable names to node IDs
    const currNode = String(
      variables?.u !== undefined     ? (typeof variables.u === 'number' ? String.fromCharCode(65 + variables.u) : variables.u) :
      variables?.node !== undefined  ? variables.node :
      variables?.curr !== undefined  ? variables.curr : 'B'
    );

    const visitedArr = [];
    if (arrays?.visited) {
      arrays.visited.forEach((v, i) => { if (v === 1 || v === true) visitedArr.push(String.fromCharCode(65 + i)); });
    } else {
      visitedArr.push('A');
    }

    let qItems = [];
    const qArr = arrays?.q || arrays?.queue;
    if (Array.isArray(qArr)) {
      qItems = qArr.filter(Boolean).map(v => typeof v === 'number' ? String.fromCharCode(65 + v) : String(v));
    }
    if (!qItems.length) qItems = [currNode];

    return {
      nodes:       defaultNodes,
      edges:       defaultEdges,
      visited:     visitedArr,
      frontier:    [currNode],
      queue:       qItems,
      activeEdges: visitedArr.length ? [[visitedArr[visitedArr.length - 1], currNode]] : [],
      caption:     `Visiting node ${currNode} — outgoing edges explored.`,
      title:       'Graph Breadth-First Search (BFS)'
    };
  }, [graphData, variables, arrays, event]);

  const RX = 23; // node radius offset for SVG line anchoring

  return (
    <div className="rv-graph-card">
      {/* Header */}
      <div className="rv-card-header">
        <Network size={13} className="rv-icon-blue" />
        <span className="rv-card-title">{title}</span>
        <span className="rv-card-sub">Frontier Wave · Data Structure Sync</span>
      </div>

      {/* Reference layout: stage (flex:2) + queue panel (200px fixed) */}
      <div className="rv-graph-layout">
        {/* Graph stage */}
        <div className="rv-graph-stage">
          {/* SVG edges drawn UNDER nodes */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
          >
            {edges.map(([u, v], i) => {
              const a = nodes[u], b = nodes[v];
              if (!a || !b) return null;
              const isActive = activeEdges.some(e => (e[0]===u&&e[1]===v)||(e[0]===v&&e[1]===u));
              return (
                <line
                  key={i}
                  x1={a.x + RX} y1={a.y + RX}
                  x2={b.x + RX} y2={b.y + RX}
                  className={`rv-gedge ${isActive ? 'rv-gedge-active' : ''}`}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {Object.entries(nodes).map(([id, pos]) => {
            const isFrontier = frontier.includes(id);
            const isVisited  = visited.includes(id);
            let cls = 'rv-gnode';
            if (isFrontier)      cls += ' rv-gnode-frontier';
            else if (isVisited)  cls += ' rv-gnode-visited';

            return (
              <div
                key={id}
                className={cls}
                style={{ left: pos.x + 'px', top: pos.y + 'px' }}
              >
                {id}
              </div>
            );
          })}
        </div>

        {/* Queue panel — exactly as reference .qpanel */}
        <div className="rv-queue-panel">
          <h3 className="rv-queue-title">BFS QUEUE</h3>
          <div className="rv-queue-list">
            {queue.length === 0 ? (
              <div className="rv-queue-empty">empty</div>
            ) : (
              queue.map((item, i) => (
                <div key={`${item}-${i}`} className="rv-qitem">
                  {i === 0 && <span className="rv-qitem-head">HEAD</span>}
                  Node {item}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="rv-caption">
          <span className="rv-caption-dot dot-blue" />
          <span dangerouslySetInnerHTML={{ __html: caption }} />
        </div>
      )}
    </div>
  );
}
