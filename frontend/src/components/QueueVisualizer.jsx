import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, FastForward } from 'lucide-react';

/**
 * QueueVisualizer — "VisuAlgo-Style FIFO Horizontal Conveyor Animation"
 * 
 * Visualizes a Queue as a horizontal open-ended conveyor pipeline:
 * - Elements enter at REAR (Enqueue) and exit at FRONT (Dequeue)
 * - Animated FRONT and REAR pointer badges
 * - Visual item flow with spring transitions
 * - Underflow / Overflow indicators
 */
export default function QueueVisualizer({
  queueData,
  variables,
  event,
  animationDuration = 400
}) {
  if (!queueData) return null;

  const { name, array, front, rear, capacity } = queueData;

  const count = useMemo(() => {
    if (typeof front !== 'number' || typeof rear !== 'number') return 0;
    if (rear < front) return 0;
    return rear - front + 1;
  }, [front, rear]);

  const isEmpty = count === 0;
  const isFull = count >= capacity;

  // Detect active operation
  const sourceLine = (event?.sourceLine || '').trim();
  const isEnqueue = /enqueue|insert|rear\s*\+\+|\+\+\s*rear|\w+\[\s*rear\s*\]\s*=/.test(sourceLine) ||
    event?.changes?.some(c => c.name === 'rear' && c.to > c.from);
  const isDequeue = /dequeue|remove|front\s*\+\+|\+\+\s*front/.test(sourceLine) ||
    event?.changes?.some(c => c.name === 'front' && c.to > c.from);

  // Active queue elements: from front to rear
  const activeElements = useMemo(() => {
    if (!Array.isArray(array) || typeof front !== 'number' || typeof rear !== 'number') return [];
    if (rear < front) return [];

    const items = [];
    for (let i = front; i <= Math.min(rear, array.length - 1); i++) {
      items.push({
        index: i,
        value: array[i],
        isFront: i === front,
        isRear: i === rear
      });
    }
    return items;
  }, [array, front, rear]);

  return (
    <div className="dsa-card dsa-queue-card">
      <div className="dsa-header">
        <div className="dsa-title-group">
          <div className="dsa-icon-pill queue-pill">
            <FastForward size={14} />
          </div>
          <div>
            <div className="dsa-title">
              Queue Data Structure
              <span className="dsa-type-badge queue-badge">FIFO</span>
            </div>
            <div className="dsa-subtitle">
              Array <code className="hl-code">{name}[]</code> with pointers <code className="hl-code">front={front}</code>, <code className="hl-code">rear={rear}</code>
            </div>
          </div>
        </div>

        {/* Operation badge */}
        <div className="dsa-op-indicator">
          {isEnqueue && (
            <span className="op-badge op-push">
              <ArrowRight size={12} />
              ENQUEUE Action
            </span>
          )}
          {isDequeue && (
            <span className="op-badge op-pop">
              <ArrowLeft size={12} />
              DEQUEUE Action
            </span>
          )}
          {!isEnqueue && !isDequeue && (
            <span className="op-badge op-idle">
              <CheckCircle2 size={12} />
              Queue Ready
            </span>
          )}
        </div>
      </div>

      <div className="queue-pipeline-container">
        {/* Conveyor Belt Track */}
        <div className="queue-conveyor-track">
          {/* Rear (Entry) Entrance */}
          <div className="queue-end-port port-rear">
            <span className="port-label">ENQUEUE ➔</span>
            <span className="port-sub">REAR (Entry)</span>
          </div>

          {/* Queue Cells Horizontal Slot */}
          <div className="queue-pipe-tube">
            {isEmpty ? (
              <div className="queue-empty-state">
                <AlertCircle size={16} />
                <span>Queue is Empty (count = 0)</span>
              </div>
            ) : (
              <div className="queue-items-row">
                <AnimatePresence>
                  {activeElements.map((item) => (
                    <motion.div
                      key={`queue-item-${item.index}`}
                      className={`queue-cell-box ${item.isFront ? 'is-front-cell' : ''} ${item.isRear ? 'is-rear-cell' : ''}`}
                      initial={{ opacity: 0, x: -25, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 25, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    >
                      {/* Pointer badges above cell */}
                      <div className="queue-pointer-flags">
                        {item.isRear && (
                          <span className="q-flag flag-rear">REAR ▼</span>
                        )}
                        {item.isFront && (
                          <span className="q-flag flag-front">FRONT ▼</span>
                        )}
                      </div>

                      <div className="queue-cell-value">
                        {item.value}
                      </div>

                      <div className="queue-cell-index">
                        [{item.index}]
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Front (Exit) Port */}
          <div className="queue-end-port port-front">
            <span className="port-label">➔ DEQUEUE</span>
            <span className="port-sub">FRONT (Exit)</span>
          </div>
        </div>

        {/* Stats & Pointers Panel */}
        <div className="queue-stats-panel">
          <div className="queue-stat-item">
            <span className="stat-label">FRONT POINTER:</span>
            <span className="stat-val hl-cyan">{front}</span>
          </div>
          <div className="queue-stat-item">
            <span className="stat-label">REAR POINTER:</span>
            <span className="stat-val hl-purple">{rear}</span>
          </div>
          <div className="queue-stat-item">
            <span className="stat-label">ITEMS IN QUEUE:</span>
            <span className="stat-val">{count}</span>
          </div>
          <div className="queue-stat-item">
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
