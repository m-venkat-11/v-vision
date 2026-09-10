import { RotateCw, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

/**
 * LoopConditionStrip — Minimal persistent indicator strip
 * Shows a compact one-liner for loop/condition status.
 * When IterationSpaceView (Loop Storyteller) is visible, this serves as
 * a quick-glance summary; the detailed explanation lives in the storyteller.
 */
export default function LoopConditionStrip({ event }) {
  if (!event) return null;

  const loop = event.loopState?.currentLoop;
  const hasLoop = !!loop;
  const hasCond = event.conditionResult !== undefined && event.conditionResult !== null;
  const isTrue = event.conditionResult === true;

  // If no loop and no condition, don't render at all
  if (!hasLoop && !hasCond) return null;

  return (
    <div className="loop-condition-strip">
      {hasLoop && (
        <div className="strip-item loop-strip-item">
          <RotateCw size={12} className="strip-icon spin-slow" />
          <span className="strip-label">{loop.type?.toUpperCase()}</span>
          <span className="strip-val">Iter #{loop.iteration + 1}</span>
          {loop.variable && event.variables?.[loop.variable] !== undefined && (
            <code className="strip-code">{loop.variable}={event.variables[loop.variable]}</code>
          )}
        </div>
      )}

      {hasCond && (
        <div className={`strip-item cond-strip-item ${isTrue ? 'cond-true' : 'cond-false'}`}>
          {isTrue ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          <span className="strip-val">{isTrue ? 'TRUE' : 'FALSE'}</span>
        </div>
      )}
    </div>
  );
}
