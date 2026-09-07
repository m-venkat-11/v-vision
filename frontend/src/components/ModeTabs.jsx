import { Code2, HelpCircle } from 'lucide-react';

/**
 * ModeTabs — Top-level navigation toggle
 * Switches between "Visualize Code" (Monaco C execution visualizer)
 * and "Visualize a Problem" (Algorithmic reasoning & step-by-step solver).
 */
export default function ModeTabs({ activeMode = 'code', onSelectMode }) {
  return (
    <div className="mode-tabs-container">
      <button
        className={`mode-tab-btn ${activeMode === 'code' ? 'active' : ''}`}
        onClick={() => onSelectMode('code')}
      >
        <Code2 size={14} />
        <span>Visualize Code</span>
      </button>

      <button
        className={`mode-tab-btn ${activeMode === 'problem' ? 'active' : ''}`}
        onClick={() => onSelectMode('problem')}
      >
        <HelpCircle size={14} />
        <span>Visualize a Problem</span>
        <span className="mode-new-pill">AI Mode</span>
      </button>
    </div>
  );
}
