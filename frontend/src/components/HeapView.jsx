import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, ShieldAlert, CheckCircle2, Box, Info } from 'lucide-react';
import { springStandard, scaledSpring } from '../animationConfig.js';

/**
 * HeapView — Dynamic Heap Memory Visualizer
 * Shows malloc/calloc allocations and free() events with spring transitions,
 * hover tooltips, and program termination memory leak detection.
 */
export default function HeapView({ 
  heapAllocations = [], 
  isProgramEnd = false, 
  memoryLeaks = [], 
  animationDuration = 500 
}) {
  const [hoveredAddr, setHoveredAddr] = useState(null);

  if (!heapAllocations || heapAllocations.length === 0) return null;

  const spring = scaledSpring(animationDuration);
  const activeCount = heapAllocations.filter(b => !b.freed).length;
  const hasLeaks = isProgramEnd && (memoryLeaks?.length > 0 || activeCount > 0);

  return (
    <div className="heap-view-container">
      <div className="section-subtitle">
        <Database size={14} className="section-icon" style={{ color: 'var(--color-heap, #fb923c)' }} />
        <span>Dynamic Heap Memory (malloc / free)</span>
        <span className="count-tag">{heapAllocations.length} block(s) • {activeCount} active</span>
      </div>

      {/* Memory Leak Alert at Program End */}
      {hasLeaks && (
        <motion.div
          className="memory-leak-alert"
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
        >
          <ShieldAlert size={20} className="leak-icon" />
          <div className="leak-content">
            <span className="leak-title">⚠️ Memory Leak Warning!</span>
            <span className="leak-desc">
              {activeCount} heap memory block(s) were allocated with malloc() but never released with free() before program termination.
            </span>
          </div>
        </motion.div>
      )}

      {/* Grid of heap blocks */}
      <div className="heap-blocks-grid">
        <AnimatePresence>
          {heapAllocations.map(block => {
            const isFreed = block.freed;
            const isHovered = hoveredAddr === block.address;

            return (
              <motion.div
                key={block.address}
                className={`heap-block-box ${isFreed ? 'is-freed' : 'is-allocated'}`}
                initial={{ opacity: 0, scale: 0.85, x: -16 }}
                animate={{ 
                  opacity: isFreed ? 0.45 : 1, 
                  scale: isFreed ? 0.95 : 1, 
                  x: 0 
                }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={spring}
                layout
                onMouseEnter={() => setHoveredAddr(block.address)}
                onMouseLeave={() => setHoveredAddr(null)}
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

                {/* Hover Details Tooltip */}
                {isHovered && (
                  <motion.div
                    className="heap-tooltip"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="tt-row">
                      <span className="tt-label">Heap Address:</span>
                      <code className="tt-code">{block.address}</code>
                    </div>
                    <div className="tt-row">
                      <span className="tt-label">Holding Pointer:</span>
                      <span className="tt-val">{block.variable}</span>
                    </div>
                    <div className="tt-row">
                      <span className="tt-label">Allocation Size:</span>
                      <span className="tt-val">{block.sizeExpr || '4 bytes'}</span>
                    </div>
                    <div className="tt-row">
                      <span className="tt-label">Lifecycle Status:</span>
                      <span className={`tt-status ${isFreed ? 'tt-freed' : 'tt-active'}`}>
                        {isFreed ? 'Deallocated (safe)' : 'In Use (Unfreed)'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
