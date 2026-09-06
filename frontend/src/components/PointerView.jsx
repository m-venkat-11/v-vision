import { motion, AnimatePresence } from 'motion/react';
import { Compass, ArrowRight, CornerDownRight, Sparkles } from 'lucide-react';

export default function PointerView({ pointers, variables, event, animationDuration }) {
  if (!pointers || Object.keys(pointers).length === 0) return null;

  const isDeref = event?.eventType === 'POINTER_DEREFERENCE';

  return (
    <div className="pointer-view-card">
      <div className="section-subtitle">
        <Compass size={14} className="section-icon" />
        <span>Pointers & Memory Addresses</span>
        <span className="count-tag">{Object.keys(pointers).length} pointer(s)</span>
      </div>

      <div className="pointer-grid">
        <AnimatePresence mode="popLayout">
          {Object.entries(pointers).map(([name, ptr]) => {
            const pointsTo = ptr.pointsToVar;
            const targetVal = pointsTo && variables && variables[pointsTo] !== undefined 
              ? variables[pointsTo] 
              : (ptr.dereferencedValue !== null ? ptr.dereferencedValue : '—');

            const isNull = !ptr.targetAddress || ptr.targetAddress === '0x0';

            return (
              <motion.div
                key={name}
                className={`pointer-item-box ${isDeref ? 'is-dereferencing' : ''}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: animationDuration / 1000 }}
                layout
              >
                <div className="pointer-header">
                  <span className="pointer-type">int*</span>
                  <span className="pointer-name">{name}</span>
                  <span className="pointer-self-addr">addr: {ptr.address || '0x...'}</span>
                </div>

                <div className="pointer-body">
                  <div className="pointer-target-addr">
                    <span className="addr-label">Points to:</span>
                    <span className={`addr-val ${isNull ? 'null-val' : ''}`}>
                      {isNull ? 'NULL (0x0)' : ptr.targetAddress}
                    </span>
                  </div>

                  {!isNull && (
                    <div className="pointer-link-arrow">
                      <ArrowRight size={14} className="arrow-pulse" />
                      <div className="target-pill">
                        <span className="target-var-name">
                          {pointsTo ? pointsTo : `*${name}`}
                        </span>
                        <span className="target-deref-val">
                          = {targetVal}
                        </span>
                      </div>
                    </div>
                  )}

                  {isDeref && (
                    <div className="deref-pulse-badge">
                      <Sparkles size={11} />
                      <span>*dereferencing</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
