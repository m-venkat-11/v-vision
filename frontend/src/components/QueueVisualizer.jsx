import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, ArrowDown, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * QueueVisualizer — Faithful FIFO Horizontal Conveyor matching WsCube / Unstop reference
 *
 * Visual Design:
 * - Horizontal open pipeline of cells: [ 3 ][ 4 ][ 5 ][ 6 ][ 7 ][ 8 ]
 * - "Front / Head" label + downward arrow on leftmost cell (exit side)
 * - "Back / Tail / Rear" label + downward arrow on rightmost cell (entry side)
 * - ENQUEUE: new cell slides in from the right with an incoming animation
 * - DEQUEUE: front cell slides out to the left with an exit animation
 * - Cells are distinctly coloured for FRONT (cyan glow) and REAR (purple glow)
 */
export default function QueueVisualizer({
  queueData,
  variables,
  event,
  animationDuration = 400
}) {
  if (!queueData) return null;

  const { name, array, front, rear, capacity } = queueData;

  // Count of active items in queue
  const count = useMemo(() => {
    if (typeof front !== 'number' || typeof rear !== 'number') return 0;
    if (rear < front) return 0;
    return rear - front + 1;
  }, [front, rear]);

  const isEmpty = count === 0;
  const isFull  = count >= capacity;

  // Detect operation
  const sourceLine = (event?.sourceLine || '').trim();
  const changes    = event?.changes || [];

  const isEnqueue = /enqueue|rear\s*\+\+|\+\+\s*rear|\w+\[\s*(?:\+\+\s*rear|rear\s*\+\+)\s*\]|\w+\[rear\]\s*=/.test(sourceLine)
    || changes.some(c => c.name === 'rear' && typeof c.to === 'number' && typeof c.from === 'number' && c.to > c.from);

  const isDequeue = /dequeue|front\s*\+\+|\+\+\s*front/.test(sourceLine)
    || changes.some(c => c.name === 'front' && typeof c.to === 'number' && typeof c.from === 'number' && c.to > c.from);

  // Build ordered cell list: front → rear
  const activeElements = useMemo(() => {
    if (!Array.isArray(array) || typeof front !== 'number' || typeof rear !== 'number') return [];
    if (rear < front) return [];
    const items = [];
    for (let i = front; i <= Math.min(rear, array.length - 1); i++) {
      items.push({ index: i, value: array[i], isFront: i === front, isRear: i === rear });
    }
    return items;
  }, [array, front, rear]);

  return (
    <div className="dsa-card dsa-queue-card">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="dsa-header">
        <div className="dsa-title-group">
          <div className="dsa-icon-pill queue-pill">
            <ArrowRight size={14} />
          </div>
          <div>
            <div className="dsa-title">
              Queue Data Structure
              <span className="dsa-type-badge queue-badge">FIFO</span>
            </div>
            <div className="dsa-subtitle">
              Array <code className="hl-code">{name}[{capacity}]</code> &nbsp;·&nbsp;
              <code className="hl-code">front={front}</code> &nbsp;
              <code className="hl-code">rear={rear}</code>
            </div>
          </div>
        </div>

        <div className="dsa-op-indicator">
          {isEnqueue && (
            <span className="op-badge op-push">
              <ArrowRight size={12} /> ENQUEUE
            </span>
          )}
          {isDequeue && (
            <span className="op-badge op-pop">
              <ArrowLeft size={12} /> DEQUEUE
            </span>
          )}
          {!isEnqueue && !isDequeue && (
            <span className="op-badge op-idle">
              <CheckCircle2 size={12} /> Ready
            </span>
          )}
        </div>
      </div>

      {/* ── Conveyor Belt ──────────────────────────────────── */}
      <div className="q-body">

        {/* Enqueue incoming element (floats above rear side) */}
        <AnimatePresence>
          {isEnqueue && array && rear >= 0 && (
            <motion.div
              className="q-incoming-box"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <span className="q-incoming-val">{array[rear]}</span>
              <ArrowDown size={16} className="q-incoming-arrow" />
              <span className="q-incoming-label">Enqueue</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The conveyor: DEQUEUE ← [ cells ] ← ENQUEUE */}
        <div className="q-conveyor">

          {/* LEFT: DEQUEUE / Front exit side */}
          <div className="q-port q-port-left">
            {isDequeue && (
              <motion.div
                className="q-dequeue-exit"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: -24 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ArrowLeft size={18} className="q-exit-arrow" />
              </motion.div>
            )}
            <span className="q-port-label">Dequeue</span>
            <ArrowLeft size={14} className="q-port-arrow" />
          </div>

          {/* The pipe tube with cells */}
          <div className="q-tube">
            {isEmpty ? (
              <div className="q-empty-state">
                <AlertCircle size={16} />
                <span>Queue Empty (count = 0)</span>
              </div>
            ) : (
              <div className="q-cells-row">
                <AnimatePresence initial={false}>
                  {activeElements.map((item) => (
                    <motion.div
                      key={`q-cell-${item.index}`}
                      layout
                      className={`q-cell ${item.isFront ? 'q-cell--front' : ''} ${item.isRear ? 'q-cell--rear' : ''}`}
                      initial={{ opacity: 0, x: 40, scale: 0.85 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -40, scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                    >
                      {/* Pointer flag above cell */}
                      <div className="q-cell-flag-row">
                        {item.isFront && item.isRear ? (
                          <span className="q-flag q-flag-both">FRONT = REAR ▼</span>
                        ) : (
                          <>
                            {item.isFront && <span className="q-flag q-flag-front">Front / Head ▼</span>}
                            {item.isRear  && <span className="q-flag q-flag-rear">Back / Rear ▼</span>}
                          </>
                        )}
                      </div>

                      {/* Value */}
                      <div className="q-cell-val">{item.value}</div>

                      {/* Index */}
                      <div className="q-cell-idx">[{item.index}]</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* RIGHT: ENQUEUE / Rear entry side */}
          <div className="q-port q-port-right">
            <ArrowLeft size={14} className="q-port-arrow q-port-arrow-enqueue" />
            <span className="q-port-label">Enqueue</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="q-stats">
          <div className="q-stat">
            <span className="q-stat-label">FRONT</span>
            <span className="q-stat-val" style={{ color: '#22d3ee' }}>{front}</span>
          </div>
          <div className="q-stat">
            <span className="q-stat-label">REAR</span>
            <span className="q-stat-val" style={{ color: '#c084fc' }}>{rear}</span>
          </div>
          <div className="q-stat">
            <span className="q-stat-label">COUNT</span>
            <span className="q-stat-val">{count} / {capacity}</span>
          </div>
          <div className="q-stat">
            <span className="q-stat-label">STATUS</span>
            <span className={`q-stat-val ${isEmpty ? 'val-empty' : isFull ? 'val-full' : 'val-ok'}`}>
              {isEmpty ? 'EMPTY' : isFull ? 'FULL' : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
