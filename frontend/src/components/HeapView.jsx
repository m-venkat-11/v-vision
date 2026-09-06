import { motion, AnimatePresence } from 'motion/react';
import { Database, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function HeapView({ heapAllocations = [], isProgramEnd = false, memoryLeaks = [], animationDuration }) {
  if (!heapAllocations || heapAllocations.length === 0) return null;

  const hasLeaks = isProgramEnd && memoryLeaks && memoryLeaks.length > 0;

  return (
    <div className="heap-view-container">
      <div className="section-subtitle">
        <Database size={14} className="section-icon" />
        <span>Dynamic Heap Memory (malloc / free)</span>
        <span className="count-tag">{heapAllocations.length} block(s)</span>
      </div>

      {hasLeaks && (
        <motion.div
          className="memory-leak-alert"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ShieldAlert size={18} className="leak-icon" />
          <div className="leak-content">
            <span className="leak-title">Memory Leak Detected!</span>
            <span className="leak-desc">
              {memoryLeaks.length} heap memory block(s) were allocated with malloc() but never released with free() before program termination.
            </span>
          </div>
        </motion.div>
      )}

      <div className="heap-blocks-grid">
        <AnimatePresence>
          {heapAllocations.map(block => {
            const isFreed = block.freed;

            return (
              <motion.div
                key={block.address}
                className={`heap-block-box ${isFreed ? 'is-freed' : 'is-allocated'}`}
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ 
                  opacity: isFreed ? 0.45 : 1, 
                  scale: isFreed ? 0.95 : 1, 
                  y: 0 
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: animationDuration / 1000 }}
                layout
              >
                <div className="heap-block-top">
                  <span className="heap-addr-pill">{block.address}</span>
                  <span className={`heap-status-tag ${isFreed ? 'freed' : 'active'}`}>
                    {isFreed ? 'FREED' : 'ALLOCATED'}
                  </span>
                </div>

                <div className="heap-block-body">
                  <div className="heap-size-row">
                    <span className="heap-size-label">Size:</span>
                    <span className="heap-size-val">{block.sizeExpr || 'sizeof(int)'}</span>
                  </div>
                  <div className="heap-owner-row">
                    <span className="heap-owner-label">Pointer:</span>
                    <span className="heap-owner-val">{block.variable || 'ptr'}</span>
                  </div>
                </div>

                <div className="heap-block-footer">
                  <span className="heap-line-meta">
                    Allocated at L{block.line}
                    {isFreed && block.freedLine ? ` • Freed at L${block.freedLine}` : ''}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
