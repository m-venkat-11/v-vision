import { useEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';

/**
 * LoopView — Ground-up rewrite based on Reference 1, Section 3
 * 
 * Exact animation from reference:
 *   Past cell:    .behind  → opacity .5, brightness(.75) saturate(.6), scale(.93)
 *   Current cell: .current → blue glow (0 0 0 1px #4fc3ff, 0 0 26px #4fc3ff), scale(1.15)
 *   Future cell:  default  → 15% white border, transparent BG
 * 
 * Auto-play at 650ms intervals matching reference play() function.
 */
export default function LoopView({ event }) {
  if (!event) return null;

  const { eventType, loopState, sourceLine } = event;
  const isEnd = eventType === 'LOOP_END' || eventType === 'LOOP_ENDED';
  if (!['LOOP_STARTED', 'LOOP_ITERATION', 'LOOP_ENDED', 'LOOP_END'].includes(eventType) && !loopState?.currentLoop) {
    return null;
  }

  const loop = loopState?.currentLoop;
  if (!loop) return null;

  const loopType   = loop.type      || 'for';
  const iteration  = loop.iteration || 0;
  const condition  = loop.condition || '';
  const maxIter    = loop.maxIterations ?? Math.max(iteration + 3, 6);
  const N          = Math.min(maxIter, 10);

  return (
    <div className="rv-loop-card">
      {/* Header */}
      <div className="rv-loop-header">
        <div className="rv-loop-badge">
          <RotateCw size={12} className="rv-spin" />
          <span>{loopType} loop</span>
        </div>
        {condition && (
          <code className="rv-loop-cond">{condition}</code>
        )}
        <span className="rv-loop-iter-label">
          {isEnd ? 'Loop ended' : `Iteration #${iteration + 1}`}
        </span>
      </div>

      {/* Cell grid — Reference 1 Section 3 exact pattern */}
      <div className="rv-loop-grid">
        {Array.from({ length: N }).map((_, k) => {
          let cellClass = 'rv-lcell';
          if (isEnd || k < iteration)       cellClass += ' rv-lcell-behind';
          else if (k === iteration && !isEnd) cellClass += ' rv-lcell-current';
          return (
            <div key={k} className={cellClass} title={`i = ${k}`}>
              {k}
            </div>
          );
        })}
      </div>

      {/* Caption */}
      <div className="rv-caption">
        <span className="rv-caption-dot" />
        <span>
          {isEnd
            ? `i = ${iteration} — condition false. Loop ends.`
            : `i = ${iteration} — condition true, executing body.`}
        </span>
      </div>
    </div>
  );
}
