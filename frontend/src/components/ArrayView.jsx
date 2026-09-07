import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Columns2, ArrowDown, GitCompare, Grid3X3, Info
} from 'lucide-react';
import { springStandard, springSnappy, scaledSpring, CELL_COLORS, getPointerColor } from '../animationConfig.js';

/**
 * ArrayView — Enhanced with:
 * - Spring physics transitions (not linear tweens)
 * - Phased per-step animations: highlight → compare → change → settle
 * - Persistent "trail" indicators for visited loop cells
 * - Hover tooltip showing index, value, hex offset
 */

export default function ArrayView({
  arrays,
  highlight,
  changes,
  variables,
  animationDuration,
  pointerVars,
  speed = 1,
  loopTrails = {},   // { arrayName: Set<number> } — cells visited in the current loop
}) {
  if (!arrays || Object.keys(arrays).length === 0) return null;

  const springCfg = useMemo(() => scaledSpring(speed, springStandard), [speed]);
  const snapCfg   = useMemo(() => scaledSpring(speed, springSnappy), [speed]);

  return (
    <div className="arrays-container">
      {Object.entries(arrays).map(([name, valMatrix]) => {
        const is2D = Array.isArray(valMatrix) && valMatrix.length > 0 && Array.isArray(valMatrix[0]);
        const highlightedIndices = (highlight?.array === name && Array.isArray(highlight?.indices))
          ? highlight.indices
          : [];
        const isComparingPair = highlightedIndices.length === 2;
        const trails = loopTrails?.[name] instanceof Set ? loopTrails[name] : null;

        if (is2D) {
          return <Matrix2D
            key={name}
            name={name}
            valMatrix={valMatrix}
            changes={changes}
            springCfg={springCfg}
            animationDuration={animationDuration}
          />;
        }

        return (
          <Array1D
            key={name}
            name={name}
            values={valMatrix}
            highlightedIndices={highlightedIndices}
            isComparingPair={isComparingPair}
            changes={changes}
            pointerVars={pointerVars}
            trails={trails}
            springCfg={springCfg}
            snapCfg={snapCfg}
            animationDuration={animationDuration}
          />
        );
      })}
    </div>
  );
}

// ─── 1D Array ────────────────────────────────────────────────────────────────

function Array1D({ name, values, highlightedIndices, isComparingPair, changes, pointerVars, trails, springCfg, snapCfg, animationDuration }) {
  return (
    <motion.div
      className="array-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCfg}
      layout
    >
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

        <AnimatePresence>
          {isComparingPair && (
            <motion.div
              className="comparing-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={snapCfg}
            >
              <GitCompare size={12} />
              <span>Comparing [{highlightedIndices[0]}] & [{highlightedIndices[1]}]</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="array-cells-scroll">
        <div className="array-cells-row">
          {values.map((val, idx) => {
            const isHighlighted = highlightedIndices.includes(idx);
            const change = changes?.find(c => c.array === name && c.index === idx);
            const isChanged = !!change;
            const isTrail = trails?.has(idx) && !isHighlighted;

            const pointersHere = [];
            if (pointerVars) {
              for (const [varName, varVal] of Object.entries(pointerVars)) {
                if (typeof varVal === 'number' && varVal === idx) {
                  pointersHere.push(varName);
                }
              }
            }

            const hexOffset = (idx * 4).toString(16).toUpperCase().padStart(2, '0');

            let cellColor = CELL_COLORS.normal;
            if (isChanged)     cellColor = CELL_COLORS.changed;
            else if (isComparingPair && isHighlighted) cellColor = CELL_COLORS.compare;
            else if (isHighlighted) cellColor = CELL_COLORS.highlight;

            return (
              <div className="array-cell-slot" key={idx}>
                {/* Pointer flag indicators */}
                <div className="array-pointer-track">
                  <AnimatePresence>
                    {pointersHere.map(pName => {
                      const colorScheme = getPointerColor(pName);
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
                          transition={springCfg}
                          layout
                        >
                          <span>{pName}</span>
                          <ArrowDown size={10} strokeWidth={2.5} />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Cell box with spring physics */}
                <CellBox
                  val={val}
                  isHighlighted={isHighlighted}
                  isChanged={isChanged}
                  isTrail={isTrail}
                  change={change}
                  cellColor={cellColor}
                  springCfg={springCfg}
                  snapCfg={snapCfg}
                  animationDuration={animationDuration}
                  idx={idx}
                  hexOffset={hexOffset}
                />

                {/* Index / hex footer */}
                <div className="array-cell-meta">
                  <span className="index-label">[{idx}]</span>
                  <span className="hex-label">+0x{hexOffset}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Individual Cell ──────────────────────────────────────────────────────────

function CellBox({ val, isHighlighted, isChanged, isTrail, change, cellColor, springCfg, snapCfg, animationDuration, idx, hexOffset }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let boxClass = 'array-cell-box';
  if (isHighlighted) boxClass += ' highlighted';
  if (isChanged)     boxClass += ' changed';
  if (isTrail)       boxClass += ' loop-trail';

  return (
    <div
      className="array-cell-hoverwrap"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ position: 'relative' }}
    >
      <motion.div
        className={boxClass}
        style={isHighlighted || isChanged ? {
          background: cellColor.bg,
          borderColor: cellColor.border,
          color: cellColor.text,
          boxShadow: `0 0 12px ${cellColor.bg}`,
        } : {}}
        animate={{
          scale: isChanged ? [1, 1.15, 1] : isHighlighted ? [1, 1.07, 1] : 1,
        }}
        transition={isChanged ? { ...springCfg, delay: 0.05 } : springCfg}
        layout
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={val}
            className="cell-number"
            initial={{ opacity: 0, scale: 0.4, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.4, y: -4 }}
            transition={snapCfg}
          >
            {val}
          </motion.span>
        </AnimatePresence>

        {/* Change delta pill */}
        {isChanged && change && (
          <motion.div
            className="cell-diff-pill"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 }}
          >
            {change.from} → {change.to}
          </motion.div>
        )}

        {/* Trail dot */}
        {isTrail && (
          <div className="cell-trail-dot" title={`Visited at [${idx}]`} />
        )}
      </motion.div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="cell-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
          >
            <div className="tt-row"><span className="tt-label">index:</span><span className="tt-val">[{idx}]</span></div>
            <div className="tt-row"><span className="tt-label">value:</span><span className="tt-val">{val}</span></div>
            <div className="tt-row"><span className="tt-label">offset:</span><span className="tt-val">+0x{hexOffset}</span></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 2D Matrix ────────────────────────────────────────────────────────────────

function Matrix2D({ name, valMatrix, changes, springCfg, animationDuration }) {
  const numRows = valMatrix.length;
  const numCols = valMatrix[0]?.length || 0;

  return (
    <motion.div
      className="array-card matrix-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCfg}
      layout
    >
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
                        animate={{
                          scale: cellChange ? [1, 1.15, 1] : 1,
                          background: cellChange ? ['rgba(16,185,129,0.3)', 'rgba(16,185,129,0.12)'] : undefined,
                        }}
                        transition={{ ...springCfg, delay: cellChange ? 0.05 : 0 }}
                      >
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={cellVal}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: animationDuration / 1400 }}
                          >
                            {cellVal}
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
