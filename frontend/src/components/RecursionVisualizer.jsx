import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitFork, ArrowDown, ArrowUp, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';

/**
 * RecursionVisualizer — Faithful Cascading Call Tree
 * Matches the user reference (4! -> 4*3! -> 3*2! -> 2*1! -> 1 with return values).
 */
export default function RecursionVisualizer({ timeline = [], currentStep = 0, animationDuration = 400 }) {
  if (!timeline || timeline.length === 0) return null;

  // Extract the recursive function and all unique call frames across the entire timeline
  const { funcName, allCallFrames } = useMemo(() => {
    // Find non-main function called recursively
    const funcCounts = {};
    for (const ev of timeline) {
      if (Array.isArray(ev.callStack)) {
        for (const f of ev.callStack) {
          if (f.func && f.func !== 'main' && !f.func.startsWith('__')) {
            funcCounts[f.func] = (funcCounts[f.func] || 0) + 1;
          }
        }
      }
    }

    let recFunc = Object.keys(funcCounts).sort((a, b) => funcCounts[b] - funcCounts[a])[0] || 'factorial';

    // Collect all recursive invocations in order of call
    // A new frame is identified by an increase in depth with func === recFunc
    const frames = [];
    const seenDepths = new Map();

    for (let i = 0; i < timeline.length; i++) {
      const ev = timeline[i];
      const stack = ev.callStack || [];
      const recStack = stack.filter(f => f.func === recFunc);
      const depth = recStack.length;

      if (depth > 0) {
        // Collect argument values for this depth
        const vars = { ...(ev.variables || {}) };
        const key = `${recFunc}@${depth}`;

        if (!seenDepths.has(key)) {
          const frameObj = {
            id: key,
            func: recFunc,
            depth,
            firstStep: i,
            returnStep: null,
            returnValue: undefined,
            initialVars: { ...vars },
            currentVars: { ...vars },
            isBaseCase: false
          };
          seenDepths.set(key, frameObj);
          frames.push(frameObj);
        } else {
          // Update currentVars
          const existing = seenDepths.get(key);
          if (Object.keys(vars).length > 0) {
            existing.currentVars = { ...vars };
          }
        }
      }
    }

    // Find return steps and values
    // When depth decreases, the popped frame has returned
    for (let i = 1; i < timeline.length; i++) {
      const prevEv = timeline[i - 1];
      const ev = timeline[i];
      const prevDepth = (prevEv.callStack || []).filter(f => f.func === recFunc).length;
      const curDepth = (ev.callStack || []).filter(f => f.func === recFunc).length;

      if (prevDepth > curDepth && prevDepth > 0) {
        const key = `${recFunc}@${prevDepth}`;
        const frame = seenDepths.get(key);
        if (frame && frame.returnStep === null) {
          frame.returnStep = i;
          // Look for return value in current event or previous event
          frame.returnValue = ev.returnValue ?? prevEv.returnValue ?? ev.variables?.result;
        }
      }
    }

    // Detect base case frame (the deepest frame reached)
    if (frames.length > 0) {
      const maxDepth = Math.max(...frames.map(f => f.depth));
      const baseFrame = frames.find(f => f.depth === maxDepth);
      if (baseFrame) baseFrame.isBaseCase = true;
    }

    // If no explicit frames found from callStack, construct fallback for current execution
    if (frames.length === 0) {
      frames.push({
        id: `${recFunc}@1`,
        func: recFunc,
        depth: 1,
        firstStep: 0,
        returnStep: null,
        returnValue: undefined,
        initialVars: { ...(timeline[currentStep]?.variables || {}) },
        currentVars: { ...(timeline[currentStep]?.variables || {}) },
        isBaseCase: false
      });
    }

    return { funcName: recFunc, allCallFrames: frames };
  }, [timeline]);

  // Compute live status of each frame at currentStep
  const visibleFrames = useMemo(() => {
    const curEv = timeline[currentStep] || {};
    const curStack = curEv.callStack || [];
    const curRecFrames = curStack.filter(f => f.func === funcName);
    const activeDepth = curRecFrames.length;

    return allCallFrames.map((frame, idx) => {
      const reached = currentStep >= frame.firstStep;
      const isActive = reached && (frame.depth === activeDepth);
      const isReturned = frame.returnStep !== null && currentStep >= frame.returnStep;

      // Extract argument (e.g. n = 4)
      const vars = frame.currentVars || frame.initialVars || {};
      const argEntry = Object.entries(vars).find(([k]) => !['argc', 'argv', 'result'].includes(k));
      const argVal = argEntry ? argEntry[1] : (frame.depth === 1 ? 'n' : '?');

      // Return expression computation (e.g., 4 * 6 = 24)
      let returnExpr = null;
      if (isReturned && typeof frame.returnValue !== 'undefined') {
        returnExpr = `${frame.returnValue}`;
      } else if (frame.isBaseCase && reached && (typeof argVal === 'number' && argVal <= 1)) {
        returnExpr = '1';
      }

      return {
        ...frame,
        reached,
        isActive,
        isReturned,
        argVal,
        returnExpr
      };
    });
  }, [allCallFrames, timeline, currentStep, funcName]);

  return (
    <div className="rc-card">
      {/* Header */}
      <div className="rc-header">
        <div className="rc-header-icon">
          <GitFork size={16} />
        </div>
        <div>
          <div className="rc-header-title">
            Recursion Call Tree & Unwinding
            <span className="rc-badge">{visibleFrames.filter(f => f.reached).length} / {visibleFrames.length} Active</span>
          </div>
          <div className="rc-header-sub">
            Cascading call chain: <code className="hl-code">{funcName}(n)</code> descent → base case → return unwind
          </div>
        </div>
        <div className="rc-depth-pill">
          Depth: {timeline[currentStep]?.callDepth ?? 1}
        </div>
      </div>

      {/* Cascading Tree Body */}
      <div className="rc-frames-wrap">
        <AnimatePresence>
          {visibleFrames.map((frame, idx) => {
            if (!frame.reached && idx > 0 && !visibleFrames[idx - 1]?.reached) {
              return null; // Don't show future frames until previous is reached
            }

            const nextFrame = visibleFrames[idx + 1] || null;
            const indent = idx * 28;
            const isBase = frame.isBaseCase;

            return (
              <motion.div
                key={frame.id}
                className="rc-frame-group"
                style={{ marginLeft: Math.min(indent, 140) }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: frame.reached ? 1 : 0.45, x: 0 }}
                transition={{ duration: animationDuration / 1000, delay: idx * 0.04 }}
              >
                {/* Frame Box */}
                <div
                  className={`rc-frame-card ${frame.isActive ? 'rc-frame--active' : ''} ${isBase ? 'rc-frame--base' : ''} ${!frame.reached ? 'rc-frame--pending' : ''}`}
                >
                  <div className="rc-frame-call">
                    <span className="rc-func-name">{frame.func}</span>
                    <span className="rc-func-args">({frame.argVal !== undefined ? frame.argVal : '…'})</span>

                    {/* Expression badge */}
                    {typeof frame.argVal === 'number' && (
                      <span className="rc-expr-badge">
                        {frame.argVal > 1 ? `${frame.argVal} × ${frame.func}(${frame.argVal - 1})` : '1'}
                      </span>
                    )}

                    {isBase && (
                      <span className="rc-base-tag">
                        <Zap size={10} /> Base Case
                      </span>
                    )}

                    {frame.isActive && !isBase && (
                      <span className="rc-active-tag">
                        <RefreshCw size={10} className="spin-icon" /> Active Frame
                      </span>
                    )}

                    {frame.isReturned && (
                      <span className="rc-returned-tag">
                        <CheckCircle2 size={10} /> Returned
                      </span>
                    )}
                  </div>

                  {/* Return Value / Unwind arrow (User diagram reference) */}
                  {frame.returnExpr && (
                    <div className="rc-return-row">
                      <ArrowUp size={12} className="rc-return-arrow" />
                      <span className="rc-return-val">
                        Returns {frame.returnExpr}
                      </span>
                    </div>
                  )}
                </div>

                {/* Downward Call Connector to next sub-problem */}
                {nextFrame && frame.reached && (
                  <div className="rc-call-arrow-row">
                    <div className="rc-call-line" />
                    <ArrowDown size={14} className="rc-call-arrow-icon" />
                    <span className="rc-call-expr">
                      Calls {nextFrame.func}({nextFrame.argVal ?? 'n-1'})
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
