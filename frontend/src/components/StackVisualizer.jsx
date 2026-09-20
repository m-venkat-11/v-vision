import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, ArrowDown, ArrowUp, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * StackVisualizer — "VisuAlgo-Style LIFO Vertical Chamber Animation"
 * 
 * Visualizes a Stack as an open-top chamber:
 * - Elements enter & exit strictly from the TOP
 * - PUSH animation: element drops into chamber with spring physics
 * - POP animation: element lifts out of chamber
 * - Animated TOP pointer arrow
 * - Empty / Full state indicator
 */
export default function StackVisualizer({
  stackData,
  variables,
  event,
  animationDuration = 400
}) {
  if (!stackData) return null;

  const { name, array, top, capacity } = stackData;
  const isTopValid = typeof top === 'number';
  const isEmpty = isTopValid && top < 0;
  const isFull = isTopValid && top >= capacity - 1;

  // Detect active operation from sourceLine or changes
  const sourceLine = (event?.sourceLine || '').trim();
  const isPush = /push|top\s*\+\+|\+\+\s*top|\w+\[\s*top\s*\]\s*=/.test(sourceLine) ||
    event?.changes?.some(c => c.name === 'top' && c.to > c.from);
  const isPop = /pop|top\s*--|--\s*top/.test(sourceLine) ||
    event?.changes?.some(c => c.name === 'top' && c.to < c.from);
  const isPeek = /peek|\w+\[\s*top\s*\]/.test(sourceLine) && !isPush && !isPop;

  // Active stack elements: index 0 to top
  const activeElements = useMemo(() => {
    if (!Array.isArray(array)) return [];
    const maxIdx = isTopValid ? Math.min(top, array.length - 1) : array.length - 1;
    if (maxIdx < 0) return [];

    const items = [];
    for (let i = 0; i <= maxIdx; i++) {
      items.push({
        index: i,
        value: array[i],
        isTop: i === top
      });
    }
    return items;
  }, [array, top, isTopValid]);

  return (
    <div className="dsa-card dsa-stack-card">
      <div className="dsa-header">
        <div className="dsa-title-group">
          <div className="dsa-icon-pill stack-pill">
            <Layers size={14} />
          </div>
          <div>
            <div className="dsa-title">
              Stack Data Structure
              <span className="dsa-type-badge">LIFO</span>
            </div>
            <div className="dsa-subtitle">
              Array <code className="hl-code">{name}[]</code> with pointer <code className="hl-code">top = {top}</code>
            </div>
          </div>
        </div>

        {/* Operation badge */}
        <div className="dsa-op-indicator">
          {isPush && (
            <span className="op-badge op-push">
              <ArrowDown size={12} />
              PUSH Action
            </span>
          )}
          {isPop && (
            <span className="op-badge op-pop">
              <ArrowUp size={12} />
              POP Action
            </span>
          )}
          {isPeek && (
            <span className="op-badge op-peek">
              <Layers size={12} />
              PEEK Action
            </span>
          )}
          {!isPush && !isPop && !isPeek && (
            <span className="op-badge op-idle">
              <CheckCircle2 size={12} />
              Stack Ready
            </span>
          )}
        </div>
      </div>

      <div className="stack-chamber-container">
        {/* Entrance marker */}
        <div className="stack-top-entrance">
          <span className="entrance-label">PUSH ➔ [ TOP ENTRANCE ] ➔ POP</span>
          <div className="entrance-arrows">
            <ArrowDown size={14} className="entrance-arrow-down" />
          </div>
        </div>

        {/* The Vertical Chamber */}
        <div className="stack-beaker">
          <div className="stack-beaker-walls">
            {isEmpty ? (
              <div className="stack-empty-state">
                <AlertCircle size={18} className="empty-icon" />
                <span>Stack is Empty</span>
                <span className="empty-sub">top = -1 (No elements pushed yet)</span>
              </div>
            ) : (
              <div className="stack-items-column">
                <AnimatePresence>
                  {activeElements.slice().reverse().map((item) => {
                    const isCurrentTop = item.isTop;
                    return (
                      <motion.div
                        key={`stack-item-${item.index}`}
                        className={`stack-chamber-item ${isCurrentTop ? 'is-top-item' : ''}`}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      >
                        <div className="stack-item-left">
                          <span className="stack-slot-idx">[{item.index}]</span>
                          <span className="stack-slot-val">{item.value}</span>
                        </div>

                        {isCurrentTop && (
                          <div className="stack-top-flag">
                            <ArrowRight size={12} />
                            <span>TOP</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
          {/* Base of beaker */}
          <div className="stack-beaker-base">
            <span>CLOSED BASE</span>
          </div>
        </div>

        {/* Stack Status & Stats Bar */}
        <div className="stack-stats-panel">
          <div className="stack-stat-item">
            <span className="stat-label">TOP POINTER:</span>
            <span className="stat-val hl-purple">{top}</span>
          </div>
          <div className="stack-stat-item">
            <span className="stat-label">ELEMENTS:</span>
            <span className="stat-val">{Math.max(0, top + 1)}</span>
          </div>
          <div className="stack-stat-item">
            <span className="stat-label">CAPACITY:</span>
            <span className="stat-val">{capacity}</span>
          </div>
          <div className="stack-stat-item">
            <span className="stat-label">STATUS:</span>
            <span className={`stat-val ${isEmpty ? 'val-empty' : (isFull ? 'val-full' : 'val-ok')}`}>
              {isEmpty ? 'EMPTY' : (isFull ? 'FULL' : 'ACTIVE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
