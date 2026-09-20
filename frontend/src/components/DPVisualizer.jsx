import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Table, Sparkles, Activity } from 'lucide-react';

/**
 * DPVisualizer
 * 
 * Visualizes Dynamic Programming (DP) state tables and recurrence relations.
 * Inspired by Claude Glass DP & VisuAlgo.
 * Features:
 * - Table cells bounce-fill elastically with new values
 * - Flowing animated dashed SVG dependency curves from subproblems (e.g. dp[i-1] + dp[i-2])
 * - Synchronized recurrence equation and step explanations
 */
export default function DPVisualizer({
  dpData,
  event,
  variables = {},
  arrays = {},
  animationDuration = 0.5
}) {
  const { cells, activeIndex, dependencies, formula, caption, title } = useMemo(() => {
    // 1. Direct custom dpData provided
    if (dpData) {
      return {
        cells: dpData.cells || [],
        activeIndex: dpData.activeIndex ?? -1,
        dependencies: dpData.dependencies || [],
        formula: dpData.formula || 'dp[i] = dp[i-1] + dp[i-2]',
        caption: dpData.caption || '',
        title: dpData.title || 'Dynamic Programming Table'
      };
    }

    // 2. Extract from arrays (e.g. dp, fib, memo) and variables (e.g. i, n)
    let dpArray = null;
    let arrayName = 'dp';
    for (const [name, arr] of Object.entries(arrays || {})) {
      if (/dp|fib|memo|table|ways|cost/i.test(name) && Array.isArray(arr)) {
        dpArray = arr;
        arrayName = name;
        break;
      }
    }

    const currentI = typeof variables?.i === 'number' ? variables.i :
      typeof variables?.n === 'number' ? Math.min(variables.n, 6) : 3;

    // Build canonical or real cell array
    const cellList = [];
    const maxLen = dpArray ? Math.min(dpArray.length, 8) : 7;

    for (let k = 0; k < maxLen; k++) {
      let val = '';
      let isFilled = false;

      if (dpArray && dpArray[k] !== undefined && dpArray[k] !== 0) {
        val = dpArray[k];
        isFilled = true;
      } else if (!dpArray) {
        // Fallback Fibonacci simulation
        const fib = [0, 1, 1, 2, 3, 5, 8];
        if (k <= currentI) {
          val = fib[k];
          isFilled = true;
        }
      }

      cellList.push({
        index: k,
        value: val,
        isFilled: isFilled || k < currentI
      });
    }

    const deps = currentI >= 2 ? [currentI - 1, currentI - 2] : [];

    return {
      cells: cellList,
      activeIndex: currentI,
      dependencies: deps,
      formula: `${arrayName}[${currentI}] = ${arrayName}[${currentI - 1}] + ${arrayName}[${currentI - 2}]`,
      caption: currentI >= 2 ?
        `Subproblem dependency: cell ${currentI} derives from ${currentI - 1} and ${currentI - 2}.` :
        `Base case initialization for ${arrayName}[${currentI}].`,
      title: `Dynamic Programming (${arrayName})`
    };
  }, [dpData, arrays, variables, event]);

  const CELL_WIDTH = 58;

  return (
    <div className="glass-visualizer-card dp-glass-card">
      <div className="glass-card-header">
        <div className="header-badge">
          <Table size={13} className="text-green" />
          <span>{title}</span>
        </div>
        <div className="dp-formula-pill">
          <Activity size={11} className="formula-icon" />
          <span>{formula}</span>
        </div>
      </div>

      <div className="dp-table-stage">
        {/* SVG Dependency Flow Lines */}
        <svg className="dp-dependency-svg" width="100%" height="90" viewBox="0 0 460 90">
          <defs>
            <filter id="depGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {dependencies.map((depIdx, dId) => {
            const xFrom = depIdx * CELL_WIDTH + 34;
            const xTo = activeIndex * CELL_WIDTH + 34;
            // Draw a quadratic curve above the cells
            const pathD = `M ${xFrom} 55 Q ${(xFrom + xTo) / 2} 15 ${xTo} 55`;

            return (
              <path
                key={`dep-line-${dId}`}
                d={pathD}
                fill="none"
                stroke="var(--glow-amber, #ffb74d)"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                filter="url(#depGlow)"
                className="animated-dep-line"
              />
            );
          })}
        </svg>

        {/* DP Cells Row */}
        <div className="dp-cells-row">
          {cells.map(c => {
            const isActive = c.index === activeIndex;
            const isDep = dependencies.includes(c.index);

            let cellClass = 'dp-glass-cell';
            if (isActive) cellClass += ' active-dp-cell';
            else if (isDep) cellClass += ' dep-source-cell';
            else if (c.isFilled) cellClass += ' filled-dp-cell';

            return (
              <div key={`dp-cell-${c.index}`} className="dp-cell-container">
                <motion.div
                  className={cellClass}
                  initial={isActive ? { scale: 0.6 } : false}
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ duration: animationDuration, type: 'spring' }}
                >
                  <span className="dp-cell-value">{c.value !== '' ? c.value : '·'}</span>
                </motion.div>
                <span className="dp-cell-index">[{c.index}]</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synchronized Caption */}
      {caption && (
        <div className="glass-caption-bar">
          <span className="caption-dot green-dot" />
          <span className="caption-text">{caption}</span>
        </div>
      )}
    </div>
  );
}
