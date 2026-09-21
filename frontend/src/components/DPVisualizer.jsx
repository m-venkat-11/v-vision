import { useMemo, useRef } from 'react';
import { Table } from 'lucide-react';

/**
 * DPVisualizer — Ground-up rewrite based on Reference 2, Section 1
 *
 * Exact patterns from reference:
 *   .dpcell:        60×60px, 14px radius, absolute positioned, transition all .5s cubic-bezier(.22,1,.36,1)
 *   .dpcell.filled: green glow ring (computed subproblems)
 *   .dpcell.active: blue glow ring + @keyframes bounceFill (scale .5 → 1.12 → 1.0, 0.5s)
 *   .depline:       amber dashed SVG line stroke=#ffb74d, stroke-dasharray:4 4
 *                   @keyframes flowDep { to { stroke-dashoffset: -16 } }  (flowing dashes)
 *   Index label:    absolute bottom:-20px, 10px font, color #64748b
 *   CW constant:    68px cell width for absolute positioning
 *
 * Dependency arrows are <line> elements NOT <path> — straight horizontal lines
 * at y=60 from dep cell center to active cell center.
 */
export default function DPVisualizer({ dpData, event, variables = {}, arrays = {} }) {
  const { cells, activeIndex, deps, formula, caption, title } = useMemo(() => {
    if (dpData) {
      return {
        cells:       dpData.cells       || [],
        activeIndex: dpData.activeIndex ?? -1,
        deps:        dpData.dependencies || [],
        formula:     dpData.formula     || 'dp[i] = dp[i-1] + dp[i-2]',
        caption:     dpData.caption     || '',
        title:       dpData.title       || 'Dynamic Programming'
      };
    }

    // Extract dp array from execution trace
    let dpArr = null, arrName = 'dp';
    for (const [k, v] of Object.entries(arrays || {})) {
      if (/dp|fib|memo|table|ways|cost/i.test(k) && Array.isArray(v)) {
        dpArr = v; arrName = k; break;
      }
    }

    const curI = typeof variables?.i === 'number' ? variables.i
               : typeof variables?.n === 'number' ? Math.min(variables.n, 7) : 3;

    // Fibonacci fallback values
    const fibFallback = [0, 1, 1, 2, 3, 5, 8, 13];
    const N = dpArr ? Math.min(dpArr.length, 8) : 8;
    const cellList = Array.from({ length: N }, (_, k) => {
      const val      = dpArr ? dpArr[k] : (k <= curI ? fibFallback[k] : undefined);
      const isFilled = val !== undefined && val !== null;
      return { index: k, value: isFilled ? val : '', isFilled: isFilled && k < curI };
    });

    const depIdxs = curI >= 2 ? [curI - 1, curI - 2] : [];
    const depVals = depIdxs.map(d => (dpArr ? dpArr[d] : fibFallback[d]) ?? '?');
    const activeVal = dpArr ? dpArr[curI] : fibFallback[curI];

    return {
      cells:       cellList,
      activeIndex: curI,
      deps:        depIdxs,
      formula:     curI >= 2
        ? `${arrName}[${curI}] = ${arrName}[${curI-1}](${depVals[0]}) + ${arrName}[${curI-2}](${depVals[1]}) = ${activeVal}`
        : `Base case: ${arrName}[${curI}] = ${activeVal}`,
      caption: curI >= 2
        ? `<b>dp[${curI}]</b> computed from dp[${curI-1}] and dp[${curI-2}].`
        : `Base case: <b>${arrName}[${curI}] = ${activeVal}</b>.`,
      title: `DP — ${arrName}`
    };
  }, [dpData, arrays, variables, event]);

  // Reference uses CW=68 for absolute positioning
  const CW = 68;
  const svgH = 80;

  return (
    <div className="rv-dp-card">
      {/* Header */}
      <div className="rv-card-header">
        <Table size={13} className="rv-icon-green" />
        <span className="rv-card-title">{title}</span>
        <code className="rv-formula-pill">{formula}</code>
      </div>

      {/* Stage: SVG dep lines + absolute cells */}
      <div className="rv-dp-stage" style={{ height: svgH + 32, position: 'relative', marginTop: 8 }}>
        {/* SVG dependency flow lines — exactly as reference */}
        <svg
          className="rv-dep-svg"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: svgH }}
        >
          {deps.map((d, di) => (
            <line
              key={di}
              className="rv-depline"
              x1={d * CW + 30}           y1={svgH - 22}
              x2={activeIndex * CW + 30}  y2={svgH - 22}
            />
          ))}
        </svg>

        {/* Cells — absolutely positioned exactly as reference */}
        {cells.map(c => {
          const isActive = c.index === activeIndex;
          const isDep    = deps.includes(c.index);
          let cls = 'rv-dpcell';
          if (isActive)    cls += ' rv-dpcell-active';
          else if (isDep)  cls += ' rv-dpcell-dep';
          else if (c.isFilled) cls += ' rv-dpcell-filled';

          return (
            <div
              key={c.index}
              className={cls}
              style={{ left: c.index * CW, top: 0, position: 'absolute' }}
            >
              <span className="rv-dp-val">{c.value !== '' ? c.value : '·'}</span>
              <span className="rv-dp-idx">dp[{c.index}]</span>
            </div>
          );
        })}
      </div>

      {/* Caption */}
      {caption && (
        <div className="rv-caption" style={{ marginTop: 28 }}>
          <span className="rv-caption-dot dot-green" />
          <span dangerouslySetInnerHTML={{ __html: caption }} />
        </div>
      )}
    </div>
  );
}
