import { useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, ArrowDown, ArrowUp, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

/**
 * StackVisualizer — Faithful Unstop-Style LIFO Vertical Beaker
 *
 * Visual Design (matches reference):
 * - Open-top U-shaped vertical chamber (solid left + right + bottom, open top)
 * - Elements stack from bottom to top inside the beaker
 * - TOP pointer badge floats next to the topmost element
 * - PUSH: new element animates dropping in from above (y: -40 → 0)
 * - POP: topmost element lifts out upward (y: 0 → -40, fade)
 * - Curved arc arrows hint at entry/exit direction
 * - Status pill: PUSH(val) | POP() → val | PEEK | FULL | EMPTY
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
  const isFull  = isTopValid && top >= capacity - 1;

  // Detect current operation from source line / variable changes
  const sourceLine = (event?.sourceLine || '').trim();
  const changes    = event?.changes || [];

  const isPush = /push|top\s*\+\+|\+\+\s*top|\w+\[\s*(?:\+\+\s*top|top\s*\+\+)\s*\]|\w+\[top\]\s*=/.test(sourceLine)
    || changes.some(c => c.name === 'top' && typeof c.to === 'number' && typeof c.from === 'number' && c.to > c.from);

  const isPop  = /pop|top\s*--|--\s*top/.test(sourceLine)
    || changes.some(c => c.name === 'top' && typeof c.to === 'number' && typeof c.from === 'number' && c.to < c.from);

  const isPeek = /peek|\w+\[\s*top\s*\]/.test(sourceLine) && !isPush && !isPop;

  // Compute the logically active elements (indices 0 … top)
  const activeElements = useMemo(() => {
    if (!Array.isArray(array)) return [];
    const maxIdx = isTopValid ? Math.min(top, array.length - 1) : array.length - 1;
    if (maxIdx < 0) return [];
    const items = [];
    for (let i = 0; i <= maxIdx; i++) {
      items.push({ index: i, value: array[i], isTop: i === top });
    }
    return items;
  }, [array, top, isTopValid]);

  // Operation label for the top status pill
  const opLabel = (() => {
    if (isPush && !isEmpty) return `PUSH(${array?.[top] ?? '…'})`;
    if (isPush && isEmpty)  return 'PUSH → onto empty stack';
    if (isPop)              return `POP() → removed top`;
    if (isPeek)             return `PEEK → top = ${array?.[top] ?? '?'}`;
    if (isEmpty)            return 'Stack Empty  (top = −1)';
    if (isFull)             return 'Stack Full!';
    return `Stack Active  (top = ${top})`;
  })();

  return (
    <div className="dsa-card dsa-stack-card">

      {/* ── Header ─────────────────────────────────────────── */}
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
              Array <code className="hl-code">{name}[{capacity}]</code> &nbsp;·&nbsp;
              pointer <code className="hl-code">top = {top}</code>
            </div>
          </div>
        </div>

        {/* Op badge */}
        <div className="dsa-op-indicator">
          {isPush && (
            <span className="op-badge op-push">
              <ArrowDown size={12} /> PUSH
            </span>
          )}
          {isPop && (
            <span className="op-badge op-pop">
              <ArrowUp size={12} /> POP
            </span>
          )}
          {isPeek && (
            <span className="op-badge op-peek">
              <Eye size={12} /> PEEK
            </span>
          )}
          {!isPush && !isPop && !isPeek && (
            <span className="op-badge op-idle">
              <CheckCircle2 size={12} /> Ready
            </span>
          )}
        </div>
      </div>

      {/* ── Beaker body ────────────────────────────────────── */}
      <div className="stk-body">

        {/* PUSH arrow above beaker mouth */}
        <AnimatePresence>
          {isPush && (
            <motion.div
              className="stk-push-arrow"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <div className="stk-push-arc">
                <ArrowDown size={18} />
                <span>PUSH</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* POP arrow above beaker mouth */}
        <AnimatePresence>
          {isPop && (
            <motion.div
              className="stk-pop-arrow"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="stk-pop-arc">
                <ArrowUp size={18} />
                <span>POP</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Beaker: open top, U-shape border */}
        <div className="stk-beaker">
          {/* Left wall */}
          <div className="stk-wall stk-wall-left" />
          {/* Right wall */}
          <div className="stk-wall stk-wall-right" />
          {/* Bottom sealed base */}
          <div className="stk-base" />

          {/* Inner content area */}
          <div className="stk-inner">
            {isEmpty ? (
              <div className="stk-empty">
                <AlertCircle size={16} className="stk-empty-icon" />
                <span>Stack Empty</span>
                <span className="stk-empty-sub">top = −1</span>
              </div>
            ) : (
              <div className="stk-items">
                <AnimatePresence initial={false}>
                  {/* Render bottom → top, displayed top → bottom */}
                  {[...activeElements].reverse().map((item) => (
                    <motion.div
                      key={`stk-${item.index}`}
                      className={`stk-item ${item.isTop ? 'stk-item--top' : ''}`}
                      initial={{ opacity: 0, y: -30, scaleY: 0.5 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -30, scaleY: 0.5 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                      layout
                    >
                      {/* Index slot label */}
                      <span className="stk-item-idx">[{item.index}]</span>

                      {/* Value */}
                      <span className="stk-item-val">{item.value}</span>

                      {/* TOP pointer badge on the topmost element */}
                      {item.isTop && (
                        <div className="stk-top-badge">
                          ← TOP
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="stk-stats">
          <div className="stk-stat">
            <span className="stk-stat-label">TOP POINTER</span>
            <span className="stk-stat-val" style={{ color: '#c084fc' }}>{top}</span>
          </div>
          <div className="stk-stat">
            <span className="stk-stat-label">SIZE</span>
            <span className="stk-stat-val">{Math.max(0, top + 1)} / {capacity}</span>
          </div>
          <div className="stk-stat">
            <span className="stk-stat-label">STATUS</span>
            <span className={`stk-stat-val ${isEmpty ? 'val-empty' : isFull ? 'val-full' : 'val-ok'}`}>
              {isEmpty ? 'EMPTY' : isFull ? 'FULL' : 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* Operation description pill */}
        <div className={`stk-op-pill ${isPush ? 'stk-op-push' : isPop ? 'stk-op-pop' : ''}`}>
          {opLabel}
        </div>
      </div>
    </div>
  );
}
