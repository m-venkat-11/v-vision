import { useMemo } from 'react';
import { RotateCw, Compass, Play, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * IterationSpaceView — Spatial Visualizer for Programs with Loops (no arrays)
 * 
 * Rules applied:
 * 1. 2D Iteration Grid for nested loops (outer loop = rows, inner loop = cols)
 * 2. Animated active cursor highlighting the current cell (i, j)
 * 3. Dimmed trail on visited cells
 * 4. Floating variable tags attached directly to active row (i) and column (j)
 * 5. Bound indicators (e.g. k, n) attached to the diagram
 * 6. 1D Horizontal Track for single loops with sliding neon indicator
 * 7. Zero-flicker: pure CSS transitions, stable keys
 */
export default function IterationSpaceView({
  event,
  timeline = [],
  currentStep = 0,
  animationDuration = 300
}) {
  const variables = event?.variables || {};

  // Extract loop structure from timeline
  const loopAnalysis = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;

    // 1. Identify loop variables from loopState and sourceLines
    const varOccurrenceCount = {};
    const varValueSets = {};
    const loopVarsOrdered = [];

    // Scan steps for loop variables
    for (const step of timeline) {
      if (step.loopState?.currentLoop?.variable) {
        const v = step.loopState.currentLoop.variable;
        if (!loopVarsOrdered.includes(v)) loopVarsOrdered.push(v);
      }
      if (step.loopState?.stack) {
        for (const frame of step.loopState.stack) {
          if (frame.variable && !loopVarsOrdered.includes(frame.variable)) {
            loopVarsOrdered.push(frame.variable);
          }
        }
      }

      // Check for common loop variables i, j, k, r, c, x, y in variables
      if (step.variables) {
        for (const [k, val] of Object.entries(step.variables)) {
          if (typeof val === 'number') {
            varOccurrenceCount[k] = (varOccurrenceCount[k] || 0) + 1;
            if (!varValueSets[k]) varValueSets[k] = new Set();
            varValueSets[k].add(val);
          }
        }
      }
    }

    // Fallback: If loopState didn't identify vars, look for typical loop var names that change values
    const candidateVars = ['i', 'j', 'k', 'r', 'c', 'row', 'col', 'x', 'y', 'idx', 'step', 'count'];
    for (const v of candidateVars) {
      if (varValueSets[v] && varValueSets[v].size > 1 && !loopVarsOrdered.includes(v)) {
        loopVarsOrdered.push(v);
      }
    }

    // Identify bound/limit variables (like n, m, k, limit, size)
    const boundVars = [];
    const knownBoundNames = ['n', 'm', 'k', 'limit', 'size', 'len', 'total', 'cols', 'rows', 'width', 'height'];
    for (const b of knownBoundNames) {
      if (variables[b] !== undefined && !loopVarsOrdered.includes(b)) {
        boundVars.push({ name: b, value: variables[b] });
      }
    }

    const isNested = loopVarsOrdered.length >= 2;
    const isSingle = loopVarsOrdered.length === 1;

    if (!isNested && !isSingle) {
      // If no loop vars detected, fallback to first 2 numeric variables that change
      const changingVars = Object.entries(varValueSets)
        .filter(([, set]) => set.size > 1)
        .map(([k]) => k);
      if (changingVars.length >= 2) {
        loopVarsOrdered.push(changingVars[0], changingVars[1]);
      } else if (changingVars.length === 1) {
        loopVarsOrdered.push(changingVars[0]);
      } else {
        return null;
      }
    }

    if (loopVarsOrdered.length >= 2) {
      // 2D Iteration Space
      const outerVar = loopVarsOrdered[0];
      const innerVar = loopVarsOrdered[1];

      // Collect all distinct coordinates visited across timeline
      const distinctOuter = Array.from(varValueSets[outerVar] || []).sort((a, b) => a - b);
      const distinctInner = Array.from(varValueSets[innerVar] || []).sort((a, b) => a - b);

      // Collect execution history of coordinate points
      const coordHistory = [];
      const coordSet = new Set();

      for (let s = 0; s < timeline.length; s++) {
        const step = timeline[s];
        if (step.variables && 
            step.variables[outerVar] !== undefined && 
            step.variables[innerVar] !== undefined) {
          const o = step.variables[outerVar];
          const i = step.variables[innerVar];
          const key = `${o},${i}`;
          coordHistory.push({ step: s, o, i, key });
          coordSet.add(key);
        }
      }

      // Cap grid columns if very large to keep view clean & readable
      const maxColDisplay = 16;
      const displayInner = distinctInner.length > maxColDisplay 
        ? distinctInner.slice(0, maxColDisplay) 
        : distinctInner;

      return {
        mode: '2d',
        outerVar,
        innerVar,
        distinctOuter,
        distinctInner: displayInner,
        allInnerCount: distinctInner.length,
        boundVars,
        coordHistory
      };
    } else {
      // 1D Progress Track
      const loopVar = loopVarsOrdered[0];
      const distinctVals = Array.from(varValueSets[loopVar] || []).sort((a, b) => a - b);
      const minVal = distinctVals.length > 0 ? distinctVals[0] : 0;
      const maxVal = distinctVals.length > 0 ? distinctVals[distinctVals.length - 1] : 10;

      return {
        mode: '1d',
        loopVar,
        distinctVals,
        minVal,
        maxVal,
        boundVars
      };
    }
  }, [timeline, variables]);

  if (!loopAnalysis) {
    return null;
  }

  // Current iteration coordinates
  if (loopAnalysis.mode === '2d') {
    const { outerVar, innerVar, distinctOuter, distinctInner, boundVars, coordHistory } = loopAnalysis;
    const currentOuterVal = variables[outerVar];
    const currentInnerVal = variables[innerVar];

    // Compute visited set up to currentStep
    const visitedKeys = new Set();
    let currentCellIndex = 0;
    let totalVisitedCells = 0;

    for (const entry of coordHistory) {
      if (entry.step <= currentStep) {
        visitedKeys.add(entry.key);
      }
      if (entry.step === currentStep) {
        currentCellIndex = totalVisitedCells;
      }
      totalVisitedCells++;
    }

    const currentKey = `${currentOuterVal},${currentInnerVal}`;
    const totalPossiblePoints = distinctOuter.length * distinctInner.length;
    const progressPercent = totalPossiblePoints > 0 
      ? Math.min(100, Math.round((visitedKeys.size / totalPossiblePoints) * 100))
      : 0;

    // Detect loop condition expression from current sourceLine or step
    const conditionExpr = event?.sourceLine?.match(/(?:for|while)\s*\((.*?)\)/)?.[1] || 
                         event?.loopState?.currentLoop?.condition || '';

    return (
      <div className="iteration-space-container">
        {/* Header Strip */}
        <div className="iteration-header">
          <div className="iteration-title-wrap">
            <div className="iteration-badge-icon">
              <Compass size={15} />
            </div>
            <div className="iteration-title-text">
              <span className="title-bold">2D Iteration Space</span>
              <span className="title-sub">
                Nested Loop Grid: <span className="mono-hl">{outerVar}</span> (rows) × <span className="mono-hl">{innerVar}</span> (columns)
              </span>
            </div>
          </div>

          {/* Bound Indicators (attached directly to diagram) */}
          <div className="iteration-bounds-strip">
            {boundVars.map(b => (
              <div key={b.name} className="bound-tag">
                <span className="bound-label">{b.name}</span>
                <span className="bound-val">{b.value}</span>
              </div>
            ))}
            <div className="bound-tag active-stat">
              <span className="bound-label">Progress</span>
              <span className="bound-val">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Condition Preview Banner */}
        {conditionExpr && (
          <div className="iteration-condition-banner">
            <RotateCw size={12} className="spin-slow" />
            <span className="condition-prefix">Active Loop Expression:</span>
            <span className="condition-code">{conditionExpr}</span>
            {currentOuterVal !== undefined && currentInnerVal !== undefined && (
              <span className="condition-eval">
                ({outerVar} = {currentOuterVal}, {innerVar} = {currentInnerVal})
              </span>
            )}
          </div>
        )}

        {/* Main 2D Matrix Grid */}
        <div className="iteration-grid-card">
          <div className="iteration-table-wrap">
            <table className="iteration-matrix-table">
              <thead>
                <tr>
                  {/* Top-left corner axis label */}
                  <th className="axis-origin-cell">
                    <span className="axis-var-y">{outerVar}↓</span>
                    <span className="axis-var-x">{innerVar}→</span>
                  </th>
                  {/* Column Headers for Inner Loop (e.g. j) */}
                  {distinctInner.map(colVal => {
                    const isColActive = currentInnerVal === colVal;
                    return (
                      <th 
                        key={colVal} 
                        className={`col-header-cell ${isColActive ? 'active-col' : ''}`}
                      >
                        {isColActive && (
                          <div className="floating-anchor-pill col-anchor">
                            {innerVar}={colVal}
                          </div>
                        )}
                        <span className="col-idx">{colVal}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {distinctOuter.map(rowVal => {
                  const isRowActive = currentOuterVal === rowVal;
                  return (
                    <tr key={rowVal} className={isRowActive ? 'active-row-tr' : ''}>
                      {/* Row Header for Outer Loop (e.g. i) */}
                      <th className={`row-header-cell ${isRowActive ? 'active-row' : ''}`}>
                        {isRowActive && (
                          <div className="floating-anchor-pill row-anchor">
                            {outerVar}={rowVal}
                          </div>
                        )}
                        <span className="row-idx">{rowVal}</span>
                      </th>

                      {/* Grid Cells (i, j) */}
                      {distinctInner.map(colVal => {
                        const cellKey = `${rowVal},${colVal}`;
                        const isCurrent = cellKey === currentKey;
                        const isVisited = visitedKeys.has(cellKey);

                        let cellClass = 'matrix-cell';
                        if (isCurrent) cellClass += ' cell-current';
                        else if (isVisited) cellClass += ' cell-visited';
                        else cellClass += ' cell-unvisited';

                        return (
                          <td key={colVal} className="matrix-td">
                            <div className={cellClass} title={`(${outerVar}=${rowVal}, ${innerVar}=${colVal})`}>
                              {isCurrent ? (
                                <div className="current-cursor-marker">
                                  <div className="cursor-dot" />
                                  <span className="cursor-coord">{rowVal},{colVal}</span>
                                </div>
                              ) : isVisited ? (
                                <div className="visited-trail-dot" />
                              ) : (
                                <span className="empty-coord">·</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Progress Bar & Coordinate Footer */}
          <div className="iteration-footer-bar">
            <div className="progress-rail">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercent}%`, transition: `width ${animationDuration}ms ease` }} 
              />
            </div>
            <div className="progress-legend">
              <div className="legend-item">
                <span className="legend-dot active" />
                <span>Active Cursor: ({outerVar}={currentOuterVal ?? '?'}, {innerVar}={currentInnerVal ?? '?'})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot visited" />
                <span>Visited Trail ({visitedKeys.size} points)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot unvisited" />
                <span>Unreached Iterations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1D Single Loop Track View
  const { loopVar, distinctVals, minVal, maxVal, boundVars } = loopAnalysis;
  const currentVal = variables[loopVar];
  const range = Math.max(1, maxVal - minVal);
  const percent = typeof currentVal === 'number' 
    ? Math.max(0, Math.min(100, Math.round(((currentVal - minVal) / range) * 100)))
    : 0;

  return (
    <div className="iteration-space-container">
      <div className="iteration-header">
        <div className="iteration-title-wrap">
          <div className="iteration-badge-icon">
            <Compass size={15} />
          </div>
          <div className="iteration-title-text">
            <span className="title-bold">1D Iteration Track</span>
            <span className="title-sub">
              Loop Variable: <span className="mono-hl">{loopVar}</span> (range {minVal} → {maxVal})
            </span>
          </div>
        </div>

        <div className="iteration-bounds-strip">
          {boundVars.map(b => (
            <div key={b.name} className="bound-tag">
              <span className="bound-label">{b.name}</span>
              <span className="bound-val">{b.value}</span>
            </div>
          ))}
          <div className="bound-tag active-stat">
            <span className="bound-label">{loopVar}</span>
            <span className="bound-val">{currentVal ?? '?'}</span>
          </div>
        </div>
      </div>

      <div className="track-card">
        {/* Track Number Line */}
        <div className="track-rail-container">
          <div className="track-rail-bg">
            <div 
              className="track-rail-fill" 
              style={{ width: `${percent}%`, transition: `width ${animationDuration}ms ease` }}
            />
          </div>

          {/* Stepped Ticks */}
          <div className="track-ticks-row">
            {distinctVals.map(val => {
              const tickPercent = ((val - minVal) / range) * 100;
              const isPast = typeof currentVal === 'number' && val <= currentVal;
              const isCurrent = val === currentVal;

              return (
                <div 
                  key={val} 
                  className={`track-node ${isCurrent ? 'node-current' : isPast ? 'node-past' : 'node-future'}`}
                  style={{ left: `${tickPercent}%` }}
                >
                  <div className="node-pip" />
                  <span className="node-val">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Animated Slider Marker with attached label */}
          {typeof currentVal === 'number' && (
            <div 
              className="sliding-cursor-anchor"
              style={{ left: `${percent}%`, transition: `left ${animationDuration}ms ease` }}
            >
              <div className="floating-cursor-badge">
                {loopVar} = {currentVal}
              </div>
              <div className="cursor-needle" />
            </div>
          )}
        </div>

        <div className="track-footer">
          <span>Execution Progress: {percent}%</span>
          <span>Current: {loopVar} = {currentVal ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}
