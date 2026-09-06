import { motion, AnimatePresence } from 'motion/react';
import { Layers, ArrowDown, CornerDownLeft, Activity } from 'lucide-react';

export default function CallStackView({ callStack = [], currentEvent, animationDuration }) {
  if (!callStack || callStack.length === 0) return null;

  return (
    <div className="call-stack-container">
      <div className="section-subtitle">
        <Layers size={14} className="section-icon" />
        <span>Execution Call Stack (Frames)</span>
        <span className="count-tag">Depth: {callStack.length}</span>
      </div>

      <div className="call-stack-frames-list">
        <AnimatePresence initial={false}>
          {callStack.map((frame, idx) => {
            const isTop = idx === 0;
            const isMain = frame.func === 'main';

            return (
              <motion.div
                key={`frame-${frame.level}-${frame.func}-${idx}`}
                className={`call-frame-card ${isTop ? 'is-top-active' : ''}`}
                initial={{ opacity: 0, y: -25, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ duration: animationDuration / 900, ease: 'easeOut' }}
                layout
              >
                <div className="frame-top-bar">
                  <div className="frame-func-info">
                    <span className="frame-badge">#{frame.level}</span>
                    <span className="frame-func-name">{frame.func}()</span>
                    {isTop && <span className="frame-active-pill">ACTIVE FRAME</span>}
                  </div>
                  <div className="frame-location">
                    <code>L{frame.line}</code>
                    <span className="frame-addr">{frame.addr}</span>
                  </div>
                </div>

                {isTop && currentEvent?.variables && Object.keys(currentEvent.variables).length > 0 && (
                  <div className="frame-locals-preview">
                    {Object.entries(currentEvent.variables)
                      .filter(([k]) => !['argc', 'argv'].includes(k))
                      .map(([k, v]) => (
                        <span key={k} className="frame-var-pill">
                          <span className="fv-name">{k}:</span>
                          <span className="fv-val">{typeof v === 'number' ? v : String(v)}</span>
                        </span>
                      ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
