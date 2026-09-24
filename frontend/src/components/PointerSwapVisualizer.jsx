import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';

/**
 * PointerSwapVisualizer — Memory Cells + Crossing Swap Arrows
 * Visualizes pointer-based value swapping in real memory boxes.
 */
export default function PointerSwapVisualizer({
  variables = {},
  pointers = {},
  event = {},
  timeline = [],
  currentStep = 0,
  animationDuration = 400
}) {
  const sourceLine = (event?.sourceLine || '').trim();
  const changes    = event?.changes || [];

  // Determine swap pair across timeline
  const { varA, varB } = useMemo(() => {
    // 1. Look for swap(&var1, &var2) directly from source code call in timeline
    for (const ev of timeline) {
      const m = (ev.sourceLine || '').match(/swap\s*\(\s*&([a-zA-Z_]\w*)\s*,\s*&([a-zA-Z_]\w*)\s*\)/);
      if (m && m[1] && m[2]) {
        return { varA: m[1], varB: m[2] };
      }
    }
    // 2. Check candidate pairs
    const candidatePairs = [['x', 'y'], ['a', 'b'], ['num1', 'num2'], ['first', 'second'], ['p', 'q']];
    for (const [va, vb] of candidatePairs) {
      const hasBoth = timeline.some(e => e.variables && va in e.variables) &&
                      timeline.some(e => e.variables && vb in e.variables);
      if (hasBoth) return { varA: va, varB: vb };
    }
    // 3. Fallback to any two scalars in main or variables
    const mainVars = timeline.find(e => e.function === 'main')?.variables || variables;
    const scalars = Object.keys(mainVars).filter(k => !['argc', 'argv', 'temp', 't'].includes(k));
    if (scalars.length >= 2) return { varA: scalars[0], varB: scalars[1] };
    return { varA: 'x', varB: 'y' };
  }, [timeline, variables]);

  // Find most recent clean value (avoiding uninitialized garbage > 1000000)
  const getCleanVal = (name) => {
    const isGarbage = (v) => typeof v !== 'number' || Math.abs(v) > 2000000;
    if (name in variables && !isGarbage(variables[name])) {
      return variables[name];
    }
    // Search backward in timeline
    for (let i = currentStep; i >= 0; i--) {
      const v = timeline[i]?.variables?.[name];
      if (typeof v === 'number' && !isGarbage(v)) return v;
    }
    // Search forward in timeline for initial value
    for (let i = currentStep + 1; i < timeline.length; i++) {
      const v = timeline[i]?.variables?.[name];
      if (typeof v === 'number' && !isGarbage(v)) return v;
    }
    return 0;
  };

  const valA = getCleanVal(varA);
  const valB = getCleanVal(varB);
  const tempVar = 'temp' in variables ? 'temp' : ('t' in variables ? 't' : null);
  const valTemp = tempVar ? variables[tempVar] : undefined;

  // Detect swap phase with arbitrary pointer param names (*a, *b, *x, *y, *p, *q, etc.)
  const isAssignTemp = /(?:temp|t)\s*=\s*\*\w+/.test(sourceLine);
  const isAssignA    = /\*\w+\s*=\s*\*\w+/.test(sourceLine);
  const isAssignB    = /\*\w+\s*=\s*(?:temp|t)\b/.test(sourceLine);
  const isSwapping   = isAssignTemp || isAssignA || isAssignB || /swap\s*\(/.test(sourceLine);

  // Status message
  const statusMsg = useMemo(() => {
    if (isAssignTemp) return `Step 1: Storing original ${varA} (${valTemp ?? valA}) into temporary holding variable`;
    if (isAssignA)    return `Step 2: Copying value of ${varB} (${valB}) into address of ${varA}`;
    if (isAssignB)    return `Step 3: Restoring saved temporary (${valTemp ?? valA}) into address of ${varB}`;
    if (/swap\s*\(/.test(sourceLine)) return `Calling swap(&${varA}, &${varB}) — passing memory addresses`;
    return `Variables ${varA} = ${valA} and ${varB} = ${valB} — Memory state`;
  }, [isAssignTemp, isAssignA, isAssignB, sourceLine, varA, varB, valA, valB, valTemp]);

  const ptrA = Object.values(pointers || {}).find(p => p.pointsToVar === varA);
  const ptrB = Object.values(pointers || {}).find(p => p.pointsToVar === varB);

  return (
    <div className="ps-card">
      {/* Header */}
      <div className="dsa-header">
        <div className="dsa-title-group">
          <div className="dsa-icon-pill" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>
            <ArrowLeftRight size={15} />
          </div>
          <div>
            <div className="dsa-title">
              Pointer Swap — Memory View
              <span className="dsa-type-badge" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)', color: '#fbbf24' }}>
                O(1)
              </span>
            </div>
            <div className="dsa-subtitle">
              Swapping <code className="hl-code">{varA}</code> and <code className="hl-code">{varB}</code> via pointer indirection
            </div>
          </div>
        </div>

        {isSwapping && (
          <span className="op-badge" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', color: '#fbbf24' }}>
            <ArrowLeftRight size={12} /> SWAPPING
          </span>
        )}
      </div>

      <div className="ps-body">
        {/* Variable Memory Boxes */}
        <div className="ps-mem-row">
          {/* Variable A */}
          <div className="ps-mem-block">
            {ptrA && (
              <div className="ps-ptr-label">
                <ArrowRight size={12} />
                <span>*{ptrA.name}</span>
              </div>
            )}
            <motion.div
              className={`ps-var-box ${isAssignA ? 'ps-var-box--swapping' : ''}`}
              animate={isAssignA ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <span className="ps-var-name">{varA}</span>
              <span className="ps-var-val">{valA}</span>
              <span className="ps-var-addr">{ptrA?.targetAddress || '0x61ff1c'}</span>
            </motion.div>
          </div>

          {/* Crossing Arrows */}
          <div className="ps-swap-arrows">
            <div className="ps-crossing-arrows">
              <span className="ps-swap-label">SWAP</span>
              <motion.div
                animate={isSwapping ? { rotate: [0, 180, 360] } : {}}
                transition={{ duration: 1, repeat: isSwapping ? Infinity : 0, ease: 'linear' }}
              >
                <ArrowLeftRight size={26} color="#fbbf24" />
              </motion.div>
            </div>
          </div>

          {/* Variable B */}
          <div className="ps-mem-block">
            {ptrB && (
              <div className="ps-ptr-label">
                <ArrowRight size={12} />
                <span>*{ptrB.name}</span>
              </div>
            )}
            <motion.div
              className={`ps-var-box ps-var-box--b ${isAssignB ? 'ps-var-box--swapping-b' : ''}`}
              animate={isAssignB ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <span className="ps-var-name">{varB}</span>
              <span className="ps-var-val">{valB}</span>
              <span className="ps-var-addr">{ptrB?.targetAddress || '0x61ff18'}</span>
            </motion.div>
          </div>
        </div>

        {/* Temp variable row */}
        {(tempVar || isSwapping) && (
          <div className="ps-temp-row">
            <div className="ps-temp-label">
              <span>Temporary Register:</span>
            </div>
            <div className="ps-temp-box">
              <span className="ps-var-name">temp =</span>
              <span className="ps-var-val">{valTemp !== undefined && Math.abs(valTemp) < 2000000 ? valTemp : valA}</span>
            </div>
          </div>
        )}

        {/* Step caption */}
        <div className="ps-step-caption">
          <span className="ps-caption-dot" />
          <span>{statusMsg}</span>
        </div>
      </div>
    </div>
  );
}
