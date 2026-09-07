import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, GitFork, ArrowDown, CornerDownRight, Activity, Terminal } from 'lucide-react';
import { springStandard, scaledSpring } from '../animationConfig.js';

/**
 * StackDiagramView — Stack Frame Cards & Recursion Tree
 * Dedicated stack view with toggle between vertical Stack Frame cards
 * and interactive Recursion Call Tree.
 */
export default function StackDiagramView({
  callStack = [],
  currentEvent,
  timeline = [],
  currentStep = 0,
  animationDuration = 500
}) {
  const [viewMode, setViewMode] = useState('stack'); // 'stack' | 'tree'
  const spring = scaledSpring(animationDuration);

  // Extract all recursive or function calls up to the current step for the Tree View
  const callTree = useMemo(() => {
    const calls = [];
    let callCounter = 0;
    for (let i = 0; i <= currentStep && i < timeline.length; i++) {
      const ev = timeline[i];
      if (ev.eventType === 'FUNCTION_CALLED' || ev.eventType === 'RECURSIVE_CALL') {
        calls.push({
          id: ++callCounter,
          step: i,
          func: ev.function,
          depth: ev.callDepth || 1,
          sourceLine: ev.sourceLine,
          vars: { ...ev.variables },
          isRecursive: ev.eventType === 'RECURSIVE_CALL'
        });
      }
    }
    return calls;
  }, [timeline, currentStep]);

  const hasRecursion = callTree.some(c => c.isRecursive);

  if ((!callStack || callStack.length === 0) && callTree.length === 0) return null;

  return (
    <div className="stack-diagram-container">
      <div className="stack-diagram-header">
        <div className="section-subtitle" style={{ marginBottom: 0 }}>
          <Layers size={14} className="section-icon" style={{ color: 'var(--color-stack, #a855f7)' }} />
          <span>Call Stack & Frame Hierarchy</span>
          <span className="count-tag">Depth: {callStack.length || 1}</span>
        </div>

        {/* View mode toggle pills */}
        <div className="stack-mode-toggle">
          <button
            className={`mode-toggle-btn ${viewMode === 'stack' ? 'active' : ''}`}
            onClick={() => setViewMode('stack')}
            title="Vertical call stack frames (LIFO)"
          >
            <Layers size={12} />
            <span>Stack View</span>
          </button>
          <button
            className={`mode-toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => setViewMode('tree')}
            title="Tree hierarchy of function calls and recursion"
          >
            <GitFork size={12} />
            <span>Tree View {hasRecursion && '🔄'}</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Stack Frame Cards */}
      {viewMode === 'stack' && (
        <div className="stack-frames-wrapper">
          <div className="stack-direction-indicator">
            <span className="stack-label">Stack Growth (Top of Stack)</span>
            <ArrowDown size={12} className="stack-arrow" />
          </div>

          <div className="call-stack-frames-list">
            <AnimatePresence initial={false}>
              {callStack.map((frame, idx) => {
                const isTop = idx === 0;
                const isMain = frame.func === 'main';

                // Evaluate local variables from currentEvent if active frame
                const frameVars = isTop && currentEvent?.variables
                  ? Object.entries(currentEvent.variables).filter(([k]) => !['argc', 'argv'].includes(k))
                  : [];

                return (
                  <motion.div
                    key={`frame-${frame.level || idx}-${frame.func}`}
                    className={`call-frame-card ${isTop ? 'is-top-active' : ''}`}
                    initial={{ opacity: 0, y: -24, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.9 }}
                    transition={spring}
                    layout
                  >
                    <div className="frame-top-bar">
                      <div className="frame-func-info">
                        <span className="frame-badge">Frame #{frame.level ?? (callStack.length - idx)}</span>
                        <span className="frame-func-name">{frame.func}()</span>
                        {isTop && <span className="frame-active-pill">ACTIVE FRAME</span>}
                        {isMain && !isTop && <span className="frame-main-pill">ENTRY</span>}
                      </div>
                      <div className="frame-location">
                        <code>L{frame.line || currentEvent?.line}</code>
                        {frame.addr && <span className="frame-addr">{frame.addr}</span>}
                      </div>
                    </div>

                    {/* Frame local variables */}
                    {frameVars.length > 0 && (
                      <div className="frame-locals-preview">
                        <span className="locals-title">Local Scope:</span>
                        {frameVars.map(([k, v]) => (
                          <span key={k} className="frame-var-pill">
                            <span className="fv-name">{k}:</span>
                            <span className="fv-val">{typeof v === 'number' ? v : JSON.stringify(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Mode 2: Call / Recursion Tree */}
      {viewMode === 'tree' && (
        <div className="recursion-tree-view-wrapper">
          {callTree.length === 0 ? (
            <div className="empty-tree-hint">No function call events recorded yet. Step forward to observe calls.</div>
          ) : (
            <div className="recursion-nodes-flow">
              {callTree.map((c, idx) => {
                const isLatest = idx === callTree.length - 1;
                const indent = Math.max(0, (c.depth - 1) * 20);

                return (
                  <motion.div
                    key={c.id}
                    className={`recursion-tree-node ${isLatest ? 'is-active-node' : ''}`}
                    style={{ marginLeft: `${indent}px` }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={spring}
                  >
                    <div className="node-branch-indicator">
                      <CornerDownRight size={13} className="branch-icon" />
                    </div>
                    <div className="node-content">
                      <span className="node-func-badge">{c.func}()</span>
                      <span className="node-depth-pill">depth {c.depth}</span>
                      <span className="node-args">
                        {Object.entries(c.vars)
                          .filter(([k]) => !['argc', 'argv'].includes(k))
                          .slice(0, 4)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(', ')}
                      </span>
                      {isLatest && <span className="node-current-tag">Active</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
