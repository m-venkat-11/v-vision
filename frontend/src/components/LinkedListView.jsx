import { useMemo } from 'react';
import { motion } from 'motion/react';
import { GitCommit, ArrowRight, CornerDownRight } from 'lucide-react';

/**
 * LinkedListView — "VisuAlgo-Style Node Chain & Dynamic Pointer Animation"
 * 
 * Visualizes a Singly Linked List:
 * - Each node rendered as [ DATA | NEXT ● ] box
 * - Animated SVG curved connector arrows between nodes
 * - Pointers (head, curr, temp) hovering above nodes
 * - NULL terminal terminator
 */
export default function LinkedListView({
  nodes = [],
  pointers = {},
  variables = {},
  event
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="dsa-card dsa-linkedlist-card">
      <div className="dsa-header">
        <div className="dsa-title-group">
          <div className="dsa-icon-pill ll-pill">
            <GitCommit size={14} />
          </div>
          <div>
            <div className="dsa-title">
              Singly Linked List
              <span className="dsa-type-badge ll-badge">Linear Nodes</span>
            </div>
            <div className="dsa-subtitle">
              Dynamic heap nodes linked via pointer addresses (<code className="hl-code">node-&gt;next</code>)
            </div>
          </div>
        </div>

        <div className="dsa-count-tag">
          {nodes.length} node(s)
        </div>
      </div>

      <div className="ll-nodes-chain-wrap">
        <div className="ll-nodes-chain">
          {nodes.map((node, idx) => {
            const pointersHere = [];
            for (const [pName, pObj] of Object.entries(pointers)) {
              if (pObj?.targetAddress && pObj.targetAddress === node.address) {
                pointersHere.push(pName);
              }
            }

            return (
              <div key={node.address || idx} className="ll-node-slot">
                {/* Pointers pointing to this node */}
                <div className="ll-pointer-track">
                  {pointersHere.map((p) => (
                    <span key={p} className="ll-pointer-badge">
                      {p} ▼
                    </span>
                  ))}
                </div>

                {/* Node Box */}
                <motion.div
                  className="ll-node-box"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="ll-node-data">
                    <span className="ll-field-label">val</span>
                    <span className="ll-field-val">{node.data ?? node.val ?? '?'}</span>
                  </div>

                  <div className="ll-node-next">
                    <span className="ll-field-label">next</span>
                    <div className="ll-dot-bullet" />
                  </div>
                </motion.div>

                {/* Arrow connector to next node */}
                <div className="ll-node-arrow">
                  {idx < nodes.length - 1 ? (
                    <ArrowRight size={18} className="ll-arrow-icon" />
                  ) : (
                    <div className="ll-null-terminal">
                      <ArrowRight size={14} />
                      <span className="null-pill">NULL</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
