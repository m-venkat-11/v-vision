import { useMemo } from 'react';
import { GitBranch, CheckCircle2 } from 'lucide-react';

/**
 * TreeVisualizer — Ground-up rewrite based on Reference 5 (Trees BST + Traversal)
 *
 * Exact patterns from reference:
 *   .node default: 46×46px circle, rgba(255,255,255,.06) bg, 1.5px white/15% border
 *                  backdrop-filter blur(6px), transition all .5s cubic-bezier(.22,1,.36,1)
 *   .node.compare: amber glow + scanpulse 1s infinite (search path nodes pulsing amber)
 *   .node.visited: green border, opacity .7, filter brightness(.85) (nodes already checked)
 *   .node.active:  blue glow ring (current node being examined)
 *   .node.new:     @keyframes nodeIn (scale .3 → 1.0, 0.5s elastic — newly inserted node)
 *
 *   SVG edges:
 *   default:  stroke rgba(255,255,255,.18) 2px
 *   .edge.new: stroke #4fc3ff, drop-shadow(0 0 4px rgba(79,195,255,.6)) — new edge after insert
 *
 *   Traversal sequence chips (.seqitem):
 *   Green glass pills that animate in with nodeIn
 */
export default function TreeVisualizer({ treeData, event, variables = {}, structs = {} }) {
  const { nodes, edges, activeNodeId, compareNodeIds, visitedNodeIds, newNodeId, traversalSeq, caption, title } =
    useMemo(() => {
      if (treeData?.nodes) {
        return {
          nodes:         treeData.nodes,
          edges:         treeData.edges         || [],
          activeNodeId:  treeData.activeNodeId  ?? null,
          compareNodeIds:treeData.compareNodeIds || [],
          visitedNodeIds:treeData.visitedNodeIds || [],
          newNodeId:     treeData.newNodeId      ?? null,
          traversalSeq:  treeData.traversalSeq   || [],
          caption:       treeData.caption        || '',
          title:         treeData.title          || 'Binary Search Tree'
        };
      }

      // Default BST for insertion demo — mirrors Reference 5 exactly
      const baseNodes = [
        { id: 'r',   val: 20, x: 230, y: 10  },
        { id: 'l',   val: 10, x: 110, y: 90  },
        { id: 'rr',  val: 30, x: 350, y: 90  },
        { id: 'rrl', val: 28, x: 280, y: 170 }
      ];
      const baseEdges = [
        { from: 'r', to: 'l' },
        { from: 'r', to: 'rr' },
        { from: 'rr', to: 'rrl' }
      ];

      const targetVal = variables?.key ?? variables?.val ?? variables?.target ?? 25;

      // Simulate comparison path for target value
      let compareIds = [], visitedIds = [], activeId = null;
      if (targetVal > 20)        { compareIds = ['r'];       visitedIds = []; activeId = 'rr'; }
      if (targetVal > 20 && targetVal < 30) { compareIds = ['rr']; visitedIds = ['r']; activeId = 'rrl'; }
      if (targetVal === 25)      { compareIds = ['rrl'];     visitedIds = ['r', 'rr']; }

      return {
        nodes:          baseNodes,
        edges:          baseEdges,
        activeNodeId:   activeId,
        compareNodeIds: compareIds,
        visitedNodeIds: visitedIds,
        newNodeId:      null,
        traversalSeq:   [],
        caption:        `Searching key ${targetVal} — comparison path shown.`,
        title:          'Binary Search Tree'
      };
    }, [treeData, variables, structs, event]);

  const RX = 23; // node radius for SVG center offset

  return (
    <div className="rv-tree-card">
      {/* Header */}
      <div className="rv-card-header">
        <GitBranch size={13} className="rv-icon-green" />
        <span className="rv-card-title">{title}</span>
        <span className="rv-card-sub">BST · Traversal Radar</span>
      </div>

      {/* Stage — relative container exactly as reference .stage */}
      <div className="rv-tree-stage">
        {/* SVG edges rendered UNDER nodes */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {edges.map((e, i) => {
            const a = nodes.find(n => n.id === e.from);
            const b = nodes.find(n => n.id === e.to);
            if (!a || !b) return null;
            const isNew = e.cls?.includes('new') || e.to === newNodeId;
            return (
              <line
                key={i}
                x1={a.x + RX} y1={a.y + RX}
                x2={b.x + RX} y2={b.y + RX}
                className={`rv-edge ${isNew ? 'rv-edge-new' : ''}`}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(n => {
          const isActive  = n.id === activeNodeId;
          const isCompare = compareNodeIds.includes(n.id);
          const isVisited = visitedNodeIds.includes(n.id);
          const isNew     = n.id === newNodeId || n.cls?.includes('new');

          let cls = 'rv-node';
          if (isNew)          cls += ' rv-node-new rv-node-active'; // new = nodeIn + blue
          else if (isActive)  cls += ' rv-node-active';
          else if (isCompare) cls += ' rv-node-compare'; // amber scanpulse
          else if (isVisited) cls += ' rv-node-visited'; // green dimmed

          return (
            <div
              key={n.id}
              className={cls}
              style={{ left: n.x + 'px', top: n.y + 'px' }}
            >
              {n.val}
            </div>
          );
        })}
      </div>

      {/* Traversal sequence chips — Reference 5 Section 2 exact pattern */}
      {traversalSeq && traversalSeq.length > 0 && (
        <div className="rv-traversal-seq">
          <span className="rv-seq-label">Traversal:</span>
          {traversalSeq.map((val, i) => (
            <div key={`${i}-${val}`} className="rv-seqitem">
              <CheckCircle2 size={10} />
              {val}
            </div>
          ))}
        </div>
      )}

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
