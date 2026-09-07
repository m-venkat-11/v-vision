import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, ArrowRight, Sparkles } from 'lucide-react';

/**
 * PointerView — spring physics, hover tooltip showing address + dereferenced value.
 */
export default function PointerView({ pointers, variables, event }) {
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
        {Object.entries(pointers).map(([name, ptr]) => {
          const pointsTo = ptr.pointsToVar;
          const targetVal = pointsTo && variables && variables[pointsTo] !== undefined
            ? variables[pointsTo]
            : (ptr.dereferencedValue !== null ? ptr.dereferencedValue : '—');
          const isNull = !ptr.targetAddress || ptr.targetAddress === '0x0';

          return (
            <PointerCard
              key={name}
              name={name}
              ptr={ptr}
              pointsTo={pointsTo}
              targetVal={targetVal}
              isNull={isNull}
              isDeref={isDeref}
            />
          );
        })}
      </div>
    </div>
  );
}

function PointerCard({ name, ptr, pointsTo, targetVal, isNull, isDeref }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`pointer-item-box ${isDeref ? 'is-dereferencing' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ position: 'relative' }}
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
              <span className="target-var-name">{pointsTo ? pointsTo : `*${name}`}</span>
              <span className="target-deref-val">= {targetVal}</span>
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

      {/* Hover tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="cell-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            style={{ top: 'auto', bottom: '105%' }}
          >
            <div className="tt-row"><span className="tt-label">name:</span><span className="tt-val">{name}</span></div>
            <div className="tt-row"><span className="tt-label">type:</span><span className="tt-val">int*</span></div>
            <div className="tt-row"><span className="tt-label">address:</span><span className="tt-val">{ptr.address || '?'}</span></div>
            <div className="tt-row"><span className="tt-label">target:</span><span className="tt-val">{ptr.targetAddress || 'NULL'}</span></div>
            <div className="tt-row"><span className="tt-label">*value:</span><span className="tt-val">{ptr.dereferencedValue ?? '—'}</span></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
