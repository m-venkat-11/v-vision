import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitCommit, ArrowRight } from 'lucide-react';

/**
 * LinkedListView — WsCube Tech Reference Style Singly Linked List
 *
 * Visual Design (matches reference):
 * - Two-compartment nodes: [ DATA | NEXT ● ]
 * - Animated right-arrow connectors between nodes
 * - "head node" label pointing to first node
 * - NULL (⨉) terminal box on last node
 * - Traversal pointer (curr / prev / temp) badge above active node
 */
export default function LinkedListView({
  nodes = [],
  pointers = {},
  variables = {},
  event
}) {
  if (!nodes || nodes.length === 0) return null;

  // Find which pointer variables are traversal pointers (curr, prev, temp, head, node)
  const traversalPointers = useMemo(() => {
    const result = {};
    for (const [pName, pObj] of Object.entries(pointers)) {
      if (pObj?.targetAddress && pObj.targetAddress !== '0x0') {
        result[pName] = pObj.targetAddress;
      }
    }
    return result;
  }, [pointers]);

  return (
    <div className="dsa-card dsa-linkedlist-card">
      {/* Header */}
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
              Dynamic heap nodes linked via <code className="hl-code">node→next</code> pointers
            </div>
          </div>
        </div>
        <div className="dsa-count-tag">{nodes.length} node{nodes.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Node chain */}
      <div className="ll-chain-wrap">
        {/* HEAD NODE label */}
        <div className="ll-head-label">
          head node
          <div className="ll-head-arrow">↓</div>
        </div>

        <div className="ll-chain">
          {nodes.map((node, idx) => {
            // Find pointers pointing at this node
            const pointersHere = Object.entries(traversalPointers)
              .filter(([, addr]) => addr === node.address)
              .map(([name]) => name);

            const isFirst = idx === 0;
            const isLast  = idx === nodes.length - 1;

            return (
              <div key={node.address || idx} className="ll-node-unit">
                {/* Pointer badges above node */}
                <div className="ll-ptr-badges">
                  {pointersHere.map(p => (
                    <span key={p} className="ll-ptr-badge">{p} ▼</span>
                  ))}
                </div>

                {/* Two-compartment node box */}
                <motion.div
                  className={`ll-node-2box ${isFirst ? 'll-node-2box--head' : ''}`}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: idx * 0.04 }}
                >
                  {/* DATA compartment */}
                  <div className="ll-compartment ll-data-compartment">
                    <span className="ll-compartment-label">data</span>
                    <span className="ll-compartment-val">{node.data ?? node.val ?? '?'}</span>
                  </div>

                  {/* NEXT pointer compartment */}
                  <div className="ll-compartment ll-next-compartment">
                    <span className="ll-compartment-label">next</span>
                    <div className="ll-next-dot" />
                  </div>
                </motion.div>

                {/* Arrow or NULL terminator */}
                <div className="ll-connector">
                  {!isLast ? (
                    <div className="ll-arrow-connector">
                      <div className="ll-arrow-line" />
                      <ArrowRight size={14} className="ll-arrow-head" />
                    </div>
                  ) : (
                    <div className="ll-null-connector">
                      <div className="ll-arrow-line" />
                      <ArrowRight size={14} className="ll-arrow-head" />
                      <div className="ll-null-box">
                        <span className="ll-null-x">✕</span>
                        <span className="ll-null-label">NULL</span>
                      </div>
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
