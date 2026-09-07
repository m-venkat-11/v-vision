import { RotateCw, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function LoopConditionStrip({ event }) {
  if (!event) return null;

  const loop = event.loopState?.currentLoop;
  const hasLoop = !!loop;
  const hasCond = event.conditionResult !== undefined && event.conditionResult !== null;
  const isTrue = event.conditionResult === true;

  return (
    <div className="loop-condition-strip">
      {hasLoop ? (
        <div className="strip-item loop-strip-item">
          <RotateCw size={13} className="strip-icon spin-slow" />
          <span className="strip-label">{loop.type?.toUpperCase()} LOOP:</span>
          <span className="strip-val">Iteration #{loop.iteration + 1}</span>
          {loop.condition && <code className="strip-code">{loop.condition}</code>}
        </div>
      ) : (
        <div className="strip-item strip-item-idle">
          <ArrowRight size={12} className="strip-icon" />
          <span className="strip-label-idle">Sequential Execution</span>
        </div>
      )}

      {hasCond && (
        <div className={`strip-item cond-strip-item ${isTrue ? 'cond-true' : 'cond-false'}`}>
          {isTrue ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span className="strip-label">CONDITION:</span>
          <span className="strip-val">{isTrue ? 'TRUE (Branch Taken)' : 'FALSE (Branch Skipped)'}</span>
        </div>
      )}
    </div>
  );
}
