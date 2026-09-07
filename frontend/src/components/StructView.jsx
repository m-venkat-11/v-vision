import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Sparkles } from 'lucide-react';
import { springStandard, springSnappy, scaledSpring } from '../animationConfig.js';

/**
 * StructView — spring physics, per-field hover tooltip, smooth field updates.
 */
export default function StructView({ structs, event, animationDuration, speed = 1 }) {
  if (!structs || Object.keys(structs).length === 0) return null;

  const springCfg = scaledSpring(speed, springStandard);

  return (
    <motion.div
      className="struct-view-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCfg}
      layout
    >
      <div className="section-subtitle">
        <Box size={14} className="section-icon" />
        <span>Struct Instances & Composite Types</span>
        <span className="count-tag">{Object.keys(structs).length} instance(s)</span>
      </div>

      <div className="struct-cards-grid">
        <AnimatePresence mode="popLayout">
          {Object.entries(structs).map(([structName, fields]) => (
            <motion.div
              key={structName}
              className="struct-card"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={springCfg}
              layout
            >
              <div className="struct-card-header">
                <span className="struct-type-pill">struct</span>
                <span className="struct-inst-name">{structName}</span>
              </div>

              <div className="struct-fields-table">
                {Object.entries(fields).map(([fName, fVal]) => {
                  const isUpdated = event?.structChanges?.some(
                    sc => sc.struct === structName && sc.field === fName
                  );
                  return (
                    <StructFieldRow
                      key={fName}
                      fName={fName}
                      fVal={fVal}
                      isUpdated={isUpdated}
                      springCfg={springCfg}
                    />
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StructFieldRow({ fName, fVal, isUpdated, springCfg }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const valStr = typeof fVal === 'object' ? JSON.stringify(fVal) : String(fVal);

  return (
    <div
      className={`struct-field-row ${isUpdated ? 'is-field-updated' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ position: 'relative' }}
    >
      <span className="field-name">.{fName}</span>
      <span className="field-assign">=</span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${fName}-${valStr}`}
          className="field-val"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={springCfg}
        >
          {valStr}
        </motion.span>
      </AnimatePresence>

      {isUpdated && (
        <motion.span
          className="field-updated-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          <Sparkles size={9} /> updated
        </motion.span>
      )}

      {/* Hover tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="cell-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ top: 'auto', bottom: '110%', left: 0 }}
          >
            <div className="tt-row"><span className="tt-label">field:</span><span className="tt-val">.{fName}</span></div>
            <div className="tt-row"><span className="tt-label">value:</span><span className="tt-val">{valStr}</span></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
