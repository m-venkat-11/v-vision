import { Code2, PenTool, HelpCircle } from 'lucide-react';

/**
 * ModeTabs — Top-level navigation toggle
 * Switches between:
 * 1. "Algorithms & Presets" (pre-built algorithms & data structures)
 * 2. "Write Your Own Code" (dedicated playground for arbitrary user C code)
 * 3. "Problem AI" (algorithmic reasoning & problem breakdown)
 */
export default function ModeTabs({ activeMode = 'code', onSelectMode }) {
  return (
    <div className="mode-tabs-container">
      <button
        className={`mode-tab-btn ${activeMode === 'code' ? 'active' : ''}`}
        onClick={() => onSelectMode('code')}
        title="Explore standard algorithm presets & data structures"
      >
        <Code2 size={14} />
        <span className="mode-label-desktop">Algorithms & Presets</span>
        <span className="mode-label-mobile">Presets</span>
      </button>

      <button
        className={`mode-tab-btn mode-tab-custom ${activeMode === 'custom' ? 'active' : ''}`}
        onClick={() => onSelectMode('custom')}
        title="Write, edit, and visualize your own custom C code"
      >
        <PenTool size={13} />
        <span className="mode-label-desktop">Write Your Own Code</span>
        <span className="mode-label-mobile">Write Code</span>
        <span className="mode-custom-pill">Playground</span>
      </button>

      <button
        className={`mode-tab-btn ${activeMode === 'problem' ? 'active' : ''}`}
        onClick={() => onSelectMode('problem')}
        title="AI problem solver & step-by-step reasoning"
      >
        <HelpCircle size={14} />
        <span className="mode-label-desktop">Problem AI</span>
        <span className="mode-label-mobile">Problem AI</span>
        <span className="mode-new-pill">AI</span>
      </button>
    </div>
  );
}
