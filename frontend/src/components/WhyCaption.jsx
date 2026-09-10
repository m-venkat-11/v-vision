import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ArrowRight, Activity, Terminal, GitBranch, Repeat, Database } from 'lucide-react';

const EVENT_CONFIG = {
  LOOP_STARTED: {
    label: 'Loop Start',
    icon: Repeat,
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.3)'
  },
  LOOP_ITERATION: {
    label: 'Iteration',
    icon: Repeat,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    border: 'rgba(167, 139, 250, 0.3)'
  },
  CONDITION_CHECKED: {
    label: 'Branch Condition',
    icon: GitBranch,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.3)'
  },
  VARIABLE_CREATED: {
    label: 'Variable Init',
    icon: Database,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.15)',
    border: 'rgba(52, 211, 153, 0.3)'
  },
  VARIABLE_CHANGED: {
    label: 'State Mutation',
    icon: Activity,
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.15)',
    border: 'rgba(192, 132, 252, 0.3)'
  },
  ARRAY_CHANGED: {
    label: 'Array Mutation',
    icon: Database,
    color: '#f472b6',
    bg: 'rgba(244, 114, 182, 0.15)',
    border: 'rgba(244, 114, 182, 0.3)'
  },
  ARRAY_ACCESS: {
    label: 'Memory Read',
    icon: Database,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.3)'
  },
  PROGRAM_END: {
    label: 'Execution Terminated',
    icon: Terminal,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  STATEMENT: {
    label: 'Statement',
    icon: Activity,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.3)'
  }
};

export default function WhyCaption({ event, step, animationDuration }) {
  if (!event) return null;

  const eventType = event.eventType || 'STATEMENT';
  const config = EVENT_CONFIG[eventType] || EVENT_CONFIG.STATEMENT;
  const IconComponent = config.icon;

  return (
    <div className="why-engine-banner">
      <div className="why-banner-top">
        <div 
          className="why-event-pill"
          style={{
            background: config.bg,
            borderColor: config.border,
            color: config.color
          }}
        >
          <IconComponent size={12} strokeWidth={2.5} />
          <span>{config.label}</span>
          <span className="why-step-dot">•</span>
          <span className="why-step-num">Step {step + 1}</span>
        </div>

        {event.sourceLine && (
          <div className="why-source-snippet">
            <span className="source-label">Line {event.line}:</span>
            <code className="source-code">{event.sourceLine}</code>
          </div>
        )}

        {event.stepOutput && (
          <div className="why-output-pill">
            <Terminal size={11} />
            <span>Printed: <code>{event.stepOutput.trim()}</code></span>
          </div>
        )}
      </div>

      <div className="why-narrative-text">
        <Lightbulb size={16} className="why-bulb-icon" />
        <span className="why-text-body">{event.why}</span>
      </div>
    </div>
  );
}
