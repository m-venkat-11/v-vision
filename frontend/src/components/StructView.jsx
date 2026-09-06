import { motion, AnimatePresence } from 'motion/react';
import { Box, Sparkles } from 'lucide-react';

export default function StructView({ structs, event, animationDuration }) {
  if (!structs || Object.keys(structs).length === 0) return null;

  return (
    <div className="struct-view-container">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: animationDuration / 1000 }}
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
                    <div 
                      key={fName} 
                      className={`struct-field-row ${isUpdated ? 'is-field-updated' : ''}`}
                    >
                      <span className="field-name">.{fName}</span>
                      <span className="field-assign">=</span>
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={`${fName}-${fVal}`}
                          className="field-val"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: animationDuration / 1400 }}
                        >
                          {typeof fVal === 'object' ? JSON.stringify(fVal) : String(fVal)}
                        </motion.span>
                      </AnimatePresence>

                      {isUpdated && (
                        <span className="field-updated-badge">
                          <Sparkles size={9} /> updated
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
