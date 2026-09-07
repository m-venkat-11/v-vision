import { useState, useMemo, useRef } from 'react';
import { Layers, GitFork, ArrowDown, CornerDownRight } from 'lucide-react';

/**
 * StackDiagramView — Zero-flicker Stack Frame Cards & Recursion Tree
 *
 * Anti-flicker rules applied:
 *  - No `layout` prop (kills FLIP re-measurement every step)
 *  - No spring on frame cards (spring with changing y/scale = beat/bounce)
 *  - No AnimatePresence exit animations on iterative playback
 *  - CSS transition only on background-color / border-color (no transform)
 */
export default function StackDiagramView({
  callStack = [],
  currentEvent,
  timeline = [],
  currentStep = 0,
  animationDuration = 400
}) {
  const [viewMode, setViewMode] = useState('stack'); // 'stack' | 'tree'

  // Track which frame keys have already been rendered so we only
  // animate NEWLY appearing frames, not existing ones on every step.
  const seenFrameKeys = useRef(new Set());

  // Extract all recursive or function calls up to the current step for Tree View
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
          <span>Call Stack &amp; Frame Hierarchy</span>
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

      {/* Mode 1: Stack Frame Cards — No layout prop, no spring jitter */}
      {viewMode === 'stack' && (
        <div className="stack-frames-wrapper">
          <div className="stack-direction-indicator">
            <span className="stack-label">Stack Growth (Top of Stack)</span>
            <ArrowDown size={12} className="stack-arrow" />
          </div>

          <div className="call-stack-frames-list">
            {callStack.map((frame, idx) => {
              const isTop = idx === 0;
              const isMain = frame.func === 'main';
              const frameKey = `frame-${frame.level ?? idx}-${frame.func}`;

              // Only do fade-in on frames that haven't appeared yet
              const isNew = !seenFrameKeys.current.has(frameKey);
              if (isNew) seenFrameKeys.current.add(frameKey);

              // Only show locals for the topmost active frame
              const frameVars = isTop && currentEvent?.variables
                ? Object.entries(currentEvent.variables)
                    .filter(([k]) => !['argc', 'argv'].includes(k))
                    .slice(0, 6)
                : [];

              return (
                <div
                  key={frameKey}
                  className={`call-frame-card ${isTop ? 'is-top-active' : ''} ${isNew ? 'frame-entering' : ''}`}
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

                  {/* Frame local variables — stable, no Framer Motion */}
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Call / Recursion Tree — stable incremental list */}
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
                  <div
                    key={c.id}
                    className={`recursion-tree-node ${isLatest ? 'is-active-node' : ''}`}
                    style={{ marginLeft: `${indent}px` }}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
