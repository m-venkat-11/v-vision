import { motion } from 'motion/react';
import { GitFork, CornerDownRight } from 'lucide-react';

export default function RecursionTreeView({ timeline = [], currentStep = 0, animationDuration }) {
  if (!timeline || timeline.length === 0) return null;

  // Extract all function calls up to current step
  const calls = [];
  let callId = 0;

  for (let i = 0; i <= currentStep; i++) {
    const ev = timeline[i];
    if (ev.eventType === 'FUNCTION_CALLED' || ev.eventType === 'RECURSIVE_CALL') {
      calls.push({
        id: ++callId,
        step: i,
        func: ev.function,
        depth: ev.callDepth || 1,
        sourceLine: ev.sourceLine,
        vars: { ...ev.variables }
      });
    }
  }

  if (calls.length === 0) return null;

  return (
    <div className="recursion-tree-container">
      <div className="section-subtitle">
        <GitFork size={14} className="section-icon" />
        <span>Recursion & Function Call Tree</span>
        <span className="count-tag">{calls.length} call(s)</span>
      </div>

      <div className="recursion-nodes-flow">
        {calls.map((c, idx) => {
          const isLatest = idx === calls.length - 1;
          const indent = Math.max(0, (c.depth - 1) * 24);

          return (
            <motion.div
              key={c.id}
              className={`recursion-tree-node ${isLatest ? 'is-active-node' : ''}`}
              style={{ marginLeft: `${indent}px` }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: animationDuration / 1000 }}
            >
              <div className="node-branch-indicator">
                <CornerDownRight size={14} className="branch-icon" />
              </div>
              <div className="node-content">
                <span className="node-func-badge">{c.func}()</span>
                <span className="node-args">
                  {Object.entries(c.vars)
                    .filter(([k]) => !['argc', 'argv'].includes(k))
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                </span>
                <span className="node-depth-pill">depth {c.depth}</span>
                {isLatest && <span className="node-current-tag">Evaluating</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
