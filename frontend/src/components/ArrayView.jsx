import { motion, AnimatePresence } from 'motion/react';
import { Layers, ArrowDown, GitCompare, Grid3X3 } from 'lucide-react';

const POINTER_COLORS = {
  i: { bg: 'rgba(99, 102, 241, 0.25)', border: '#818cf8', text: '#c7d2fe' },
  j: { bg: 'rgba(245, 158, 11, 0.25)', border: '#fbbf24', text: '#fde68a' },
  k: { bg: 'rgba(56, 189, 248, 0.25)', border: '#38bdf8', text: '#e0f2fe' },
  left: { bg: 'rgba(6, 182, 212, 0.25)', border: '#22d3ee', text: '#cffafe' },
  right: { bg: 'rgba(168, 85, 247, 0.25)', border: '#c084fc', text: '#f3e8ff' },
  max: { bg: 'rgba(16, 185, 129, 0.25)', border: '#34d399', text: '#d1fae5' },
  min: { bg: 'rgba(239, 68, 68, 0.25)', border: '#f87171', text: '#fee2e2' },
  target: { bg: 'rgba(236, 72, 153, 0.25)', border: '#f472b6', text: '#fce7f3' },
  default: { bg: 'rgba(148, 163, 184, 0.25)', border: '#94a3b8', text: '#f1f5f9' },
};

export default function ArrayView({ 
  arrays, 
  highlight, 
  changes, 
  variables, 
  animationDuration, 
  pointerVars 
}) {
  if (!arrays || Object.keys(arrays).length === 0) return null;

  return (
    <div className="arrays-container">
      {Object.entries(arrays).map(([name, valMatrix]) => {
        const is2D = Array.isArray(valMatrix) && valMatrix.length > 0 && Array.isArray(valMatrix[0]);
        const highlightedIndices = (highlight?.array === name && Array.isArray(highlight?.indices)) 
          ? highlight.indices 
          : [];

        const isComparingPair = highlightedIndices.length === 2;

        if (is2D) {
          // 2D Array Rendering (Grid / Matrix)
          const numRows = valMatrix.length;
          const numCols = valMatrix[0]?.length || 0;

          return (
            <div className="array-card matrix-card" key={name}>
              <div className="array-card-header">
                <div className="array-identity">
                  <div className="array-icon-pill">
                    <Grid3X3 size={13} />
                  </div>
                  <div className="array-meta">
                    <span className="array-type">int[][]</span>
                    <span className="array-name">{name}</span>
                    <span className="array-length">[{numRows}×{numCols}]</span>
                  </div>
                </div>
              </div>

              <div className="matrix-grid-wrap">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th className="corner-th"></th>
                      {Array.from({ length: numCols }).map((_, c) => (
                        <th key={c} className="col-header-th">col [{c}]</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {valMatrix.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="row-header-td">row [{rIdx}]</td>
                        {row.map((cellVal, cIdx) => {
                          const cellChange = changes?.find(
                            ch => ch.array === name && ch.row === rIdx && ch.col === cIdx
                          );

                          return (
                            <td key={cIdx} className="matrix-cell-td">
                              <motion.div
                                className={`matrix-cell-box ${cellChange ? 'changed' : ''}`}
                                animate={{ scale: cellChange ? [1, 1.1, 1] : 1 }}
                                transition={{ duration: animationDuration / 1000 }}
                              >
                                <span>{cellVal}</span>
                              </motion.div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        // 1D Array Rendering
        const values = valMatrix;

        return (
          <div className="array-card" key={name}>
            <div className="array-card-header">
              <div className="array-identity">
                <div className="array-icon-pill">
                  <Layers size={13} />
                </div>
                <div className="array-meta">
                  <span className="array-type">int[]</span>
                  <span className="array-name">{name}</span>
                  <span className="array-length">size: {values.length}</span>
                </div>
              </div>

              {isComparingPair && (
                <motion.div 
                  className="comparing-badge"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GitCompare size={12} />
                  <span>Comparing [{highlightedIndices[0]}] & [{highlightedIndices[1]}]</span>
                </motion.div>
              )}
            </div>

            <div className="array-cells-scroll">
              <div className="array-cells-row">
                {values.map((val, idx) => {
                  const isHighlighted = highlightedIndices.includes(idx);
                  const change = changes?.find(c => c.array === name && c.index === idx);
                  const isChanged = !!change;

                  // Find pointer variables pointing to this index
                  const pointersHere = [];
                  if (pointerVars) {
                    for (const [varName, varVal] of Object.entries(pointerVars)) {
                      if (typeof varVal === 'number' && varVal === idx) {
                        pointersHere.push(varName);
                      }
                    }
                  }

                  const hexOffset = (idx * 4).toString(16).toUpperCase().padStart(2, '0');

                  return (
                    <div className="array-cell-slot" key={idx}>
                      {/* Pointers above cell */}
                      <div className="array-pointer-track">
                        <AnimatePresence>
                          {pointersHere.map(pName => {
                            const colorScheme = POINTER_COLORS[pName] || POINTER_COLORS.default;
                            return (
                              <motion.div
                                key={pName}
                                className="cell-pointer-flag"
                                style={{
                                  background: colorScheme.bg,
                                  borderColor: colorScheme.border,
                                  color: colorScheme.text
                                }}
                                initial={{ opacity: 0, y: -6, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.8 }}
                                transition={{ duration: animationDuration / 1200 }}
                                layout
                              >
                                <span>{pName}</span>
                                <ArrowDown size={10} strokeWidth={2.5} />
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Cell box */}
                      <motion.div
                        className={`array-cell-box ${isHighlighted ? 'highlighted' : ''} ${isChanged ? 'changed' : ''}`}
                        animate={{
                          scale: isHighlighted || isChanged ? [1, 1.07, 1] : 1,
                        }}
                        transition={{ duration: animationDuration / 1000 }}
                      >
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={val}
                            className="cell-number"
                            initial={{ opacity: 0, scale: 0.4, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.4, y: -4 }}
                            transition={{ duration: animationDuration / 1400 }}
                          >
                            {val}
                          </motion.span>
                        </AnimatePresence>

                        {/* Mutated delta badge */}
                        {isChanged && change && (
                          <motion.div 
                            className="cell-diff-pill"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            {change.from} → {change.to}
                          </motion.div>
                        )}
                      </motion.div>

                      {/* Cell footer */}
                      <div className="array-cell-meta">
                        <span className="index-label">[{idx}]</span>
                        <span className="hex-label">+0x{hexOffset}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
