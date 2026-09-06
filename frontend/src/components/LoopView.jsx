import { motion, AnimatePresence } from 'motion/react';
import { RotateCw, CheckCircle2 } from 'lucide-react';

export default function LoopView({ event, animationDuration }) {
  if (!event) return null;

  const { eventType, loopState, sourceLine } = event;
  if (!['LOOP_STARTED', 'LOOP_ITERATION'].includes(eventType) && !loopState) {
    return null;
  }

  const loop = loopState?.currentLoop;
  if (!loop) return null;

  const loopType = loop.type || 'for';
  const iteration = loop.iteration || 0;
  const condition = loop.condition || '';
  const isStart = eventType === 'LOOP_STARTED';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="loop-control-card"
        key={`loop-${iteration}`}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: animationDuration / 1100 }}
      >
        <div className="loop-card-left">
          <div className="loop-icon-halo">
            <RotateCw size={15} className="spin-slow" />
          </div>
          <div className="loop-details">
            <div className="loop-title-row">
              <span className="loop-badge-pill">{loopType} loop</span>
              <span className="loop-counter-pill">
                Iteration #{iteration + 1}
              </span>
            </div>
            {condition && (
              <div className="loop-eval-code">
                <code>{condition}</code>
              </div>
            )}
          </div>
        </div>

        <div className="loop-card-right">
          <div className="iteration-mini-track">
            {Array.from({ length: Math.min(6, iteration + 1) }).map((_, idx) => (
              <span 
                key={idx} 
                className={`iter-dot ${idx === iteration ? 'active' : 'passed'}`}
                title={`Iteration ${idx + 1}`}
              />
            ))}
          </div>
          <span className="loop-status-tag">
            {isStart ? 'Loop initialized' : 'Active cycle'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
