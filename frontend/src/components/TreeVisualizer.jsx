import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, CornerDownRight, CheckCircle2 } from 'lucide-react';

/**
 * TreeVisualizer
 * 
 * Visualizes Tree structures, Binary Search Trees (BST), and tree traversals.
 * Inspired by Claude Glass Trees & VisuAlgo.
 * Features:
 * - Top-down scanpulse comparison path
 * - Elastic bounce-in for newly inserted nodes
 * - Glowing SVG edges drawn from parents
 * - Live sequence chip strip for traversal order (inorder, preorder, postorder)
 */
export default function TreeVisualizer({
  treeData,
  event,
  variables = {},
  structs = {},
  animationDuration = 0.5
}) {
  // Infer or format tree nodes & edges
  const { nodes, edges, activeNodeId, compareNodeIds, visitedNodeIds, traversalSeq, title, caption } = useMemo(() => {
    // 1. Direct treeData provided
    if (treeData && treeData.nodes) {
      return {
        nodes: treeData.nodes,
        edges: treeData.edges || [],
        activeNodeId: treeData.activeNodeId ?? null,
        compareNodeIds: treeData.compareNodeIds || [],
        visitedNodeIds: treeData.visitedNodeIds || [],
        traversalSeq: treeData.traversalSeq || [],
        title: treeData.title || 'Binary Search Tree',
        caption: treeData.caption || ''
      };
    }

    // 2. Parse from structs (e.g. struct TreeNode / Node with left and right)
    const structNodes = [];
    const structEdges = [];
    const visited = [];
    const compares = [];
    let activeId = null;

    // Check if any struct has left/right pointers
    const nodeKeys = Object.keys(structs).filter(k => {
      const s = structs[k];
      return s && (typeof s === 'object') && ('left' in s || 'right' in s || 'val' in s || 'data' in s);
    });

    if (nodeKeys.length > 0) {
      // Build tree layout
      // Position root at center top, then children recursively
      const positions = {
        0: { x: 200, y: 15 },
        1: { x: 100, y: 85 },
        2: { x: 300, y: 85 },
        3: { x: 50, y: 155 },
        4: { x: 150, y: 155 },
        5: { x: 250, y: 155 },
        6: { x: 350, y: 155 }
      };

      nodeKeys.slice(0, 7).forEach((k, idx) => {
        const s = structs[k];
        const val = s.val ?? s.data ?? s.value ?? k;
        const pos = positions[idx] || { x: 50 + (idx * 50) % 350, y: 15 + Math.floor(idx / 3) * 60 };
        structNodes.push({
          id: k,
          val: val,
          x: pos.x,
          y: pos.y
        });

        if (idx > 0) {
          const parentIdx = Math.floor((idx - 1) / 2);
          if (nodeKeys[parentIdx]) {
            structEdges.push({
              from: nodeKeys[parentIdx],
              to: k,
              cls: 'active-edge'
            });
          }
        }
      });

      // Check current variable target e.g. curr, node, root
      const currVar = variables?.curr ?? variables?.current ?? variables?.root ?? variables?.p;
      if (currVar !== undefined) {
        activeId = String(currVar);
      }

      return {
        nodes: structNodes,
        edges: structEdges,
        activeNodeId: activeId,
        compareNodeIds: compares,
        visitedNodeIds: visited,
        traversalSeq: [],
        title: 'Dynamic Binary Tree',
        caption: event?.sourceLine ? `Executing: ${event.sourceLine.trim()}` : 'Tree state synchronized with memory.'
      };
    }

    // 3. Fallback Canonical BST Demo structure if tree is active in problem
    const defaultNodes = [
      { id: 'r', val: 20, x: 210, y: 15 },
      { id: 'l', val: 10, x: 100, y: 90 },
      { id: 'rr', val: 30, x: 320, y: 90 },
      { id: 'rrl', val: 25, x: 260, y: 165 },
      { id: 'rrr', val: 35, x: 375, y: 165 }
    ];
    const defaultEdges = [
      { from: 'r', to: 'l' },
      { from: 'r', to: 'rr' },
      { from: 'rr', to: 'rrl' },
      { from: 'rr', to: 'rrr' }
    ];

    // Reactive highlights based on variables e.g. key, val, target
    const targetVal = variables?.key ?? variables?.val ?? variables?.target ?? 25;
    let currActive = 'rrl';
    if (targetVal < 20) currActive = 'l';
    else if (targetVal === 20) currActive = 'r';
    else if (targetVal === 30) currActive = 'rr';
    else if (targetVal > 30) currActive = 'rrr';

    return {
      nodes: defaultNodes,
      edges: defaultEdges,
      activeNodeId: currActive,
      compareNodeIds: ['r', 'rr'],
      visitedNodeIds: ['r'],
      traversalSeq: [10, 20, 25, 30, 35],
      title: 'Binary Search Tree',
      caption: `Searching / Inserting key: ${targetVal} — Top-down comparison path active.`
    };
  }, [treeData, structs, variables, event]);

  return (
    <div className="glass-visualizer-card tree-glass-card">
      <div className="glass-card-header">
        <div className="header-badge">
          <GitBranch size={13} className="text-cyan" />
          <span>{title}</span>
        </div>
        <span className="glass-subtext">BST / Traversal Radar</span>
      </div>

      <div className="tree-stage-container">
        <svg className="tree-svg-canvas" width="100%" height="220" viewBox="0 0 440 220">
          <defs>
            <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4fc3ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render SVG connecting edges */}
          {edges.map((e, idx) => {
            const fromNode = nodes.find(n => n.id === e.from);
            const toNode = nodes.find(n => n.id === e.to);
            if (!fromNode || !toNode) return null;
            const isHighlighted = e.cls?.includes('new') || e.from === activeNodeId || e.to === activeNodeId;

            return (
              <line
                key={`edge-${idx}`}
                x1={fromNode.x + 22}
                y1={fromNode.y + 22}
                x2={toNode.x + 22}
                y2={toNode.y + 22}
                stroke={isHighlighted ? 'url(#edgeGlow)' : 'rgba(255, 255, 255, 0.18)'}
                strokeWidth={isHighlighted ? 3 : 1.8}
                filter={isHighlighted ? 'url(#glowFilter)' : undefined}
                className={isHighlighted ? 'edge-active-pulse' : ''}
              />
            );
          })}
        </svg>

        {/* Render HTML Nodes with Glass Effect */}
        {nodes.map(n => {
          const isActive = n.id === activeNodeId;
          const isCompare = compareNodeIds.includes(n.id);
          const isVisited = visitedNodeIds.includes(n.id);

          let nodeClass = 'tree-glass-node';
          if (isActive) nodeClass += ' active-tree-node';
          else if (isCompare) nodeClass += ' compare-tree-node';
          else if (isVisited) nodeClass += ' visited-tree-node';

          return (
            <motion.div
              key={n.id}
              className={nodeClass}
              style={{ left: `${n.x}px`, top: `${n.y}px` }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: isActive ? 1.15 : 1, opacity: 1 }}
              transition={{ duration: animationDuration, type: 'spring', stiffness: 260, damping: 20 }}
            >
              <span className="node-val-text">{n.val}</span>
              {isActive && <div className="node-pulse-ring" />}
            </motion.div>
          );
        })}
      </div>

      {/* Traversal sequence chip strip */}
      {traversalSeq && traversalSeq.length > 0 && (
        <div className="traversal-seq-wrap">
          <div className="traversal-seq-label">
            <CornerDownRight size={12} />
            <span>Traversal Sequence:</span>
          </div>
          <div className="traversal-chips">
            <AnimatePresence>
              {traversalSeq.map((val, idx) => (
                <motion.div
                  key={`seq-${idx}-${val}`}
                  className="seq-chip"
                  initial={{ opacity: 0, scale: 0.6, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <CheckCircle2 size={10} className="seq-check-icon" />
                  <span>{val}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Synchronized Caption */}
      {caption && (
        <div className="glass-caption-bar">
          <span className="caption-dot" />
          <span className="caption-text">{caption}</span>
        </div>
      )}
    </div>
  );
}
