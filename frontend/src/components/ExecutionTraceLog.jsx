import { useEffect, useRef } from 'react';
import { Activity, GitBranch, Repeat, Database, Terminal, ArrowRight } from 'lucide-react';

const ICONS = {
  LOOP_STARTED: Repeat,
  LOOP_ITERATION: Repeat,
  CONDITION_CHECKED: GitBranch,
  VARIABLE_CREATED: Database,
  VARIABLE_CHANGED: Activity,
  ARRAY_CHANGED: Database,
  ARRAY_ACCESS: Database,
  PROGRAM_END: Terminal,
  STATEMENT: Activity
};

export default function ExecutionTraceLog({ timeline, currentStep, onSelectStep }) {
  const activeRowRef = useRef(null);

  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentStep]);

  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="trace-log-container">
      <div className="trace-log-header-bar">
        <span>Step Index</span>
        <span>Line</span>
        <span>Action & Source Code</span>
        <span>State Summary</span>
      </div>

      <div className="trace-log-list">
        {timeline.map((event, idx) => {
          const isActive = idx === currentStep;
          const isPassed = idx < currentStep;
          const Icon = ICONS[event.eventType] || Activity;

          // Format quick variable summary
          const varSummary = event.variables ? Object.entries(event.variables)
            .filter(([k]) => !['argc', 'argv'].includes(k))
            .map(([k, v]) => `${k}=${typeof v === 'number' ? v : JSON.stringify(v)}`)
            .join(', ') : '';

          return (
            <div
              key={idx}
              ref={isActive ? activeRowRef : null}
              className={`trace-row ${isActive ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
              onClick={() => onSelectStep(idx)}
              title="Click to jump to this step"
            >
              <div className="trace-col-step">
                <span className={`step-badge ${isActive ? 'active' : ''}`}>
                  #{idx + 1}
                </span>
              </div>

              <div className="trace-col-line">
                <code>L{event.line}</code>
              </div>

              <div className="trace-col-action">
                <div className="trace-type-pill">
                  <Icon size={11} />
                  <span>{event.eventType?.replace(/_/g, ' ')}</span>
                </div>
                <code className="trace-code-text">{event.sourceLine || '—'}</code>
              </div>

              <div className="trace-col-summary">
                <span className="trace-vars-text">{varSummary || 'none'}</span>
              </div>

              {isActive && (
                <div className="trace-active-indicator">
                  <ArrowRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
