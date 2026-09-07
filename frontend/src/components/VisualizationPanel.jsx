import { useState } from 'react';
import { LayoutGrid, ListTree, Terminal, Layers, BarChart3, AlertTriangle, Sparkles } from 'lucide-react';
import VisualizationCanvas from './VisualizationCanvas';
import ConsoleTerminal from './ConsoleTerminal';
import ExecutionTraceLog from './ExecutionTraceLog';
import StackDiagramView from './StackDiagramView';
import ChartsPanel from './ChartsPanel';

export default function VisualizationPanel({ 
  event, 
  prevEvent, 
  animationDuration, 
  error,
  timeline = [],
  currentStep = 0,
  onSelectStep
}) {
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'trace' | 'terminal' | 'memory' | 'charts'

  // Error state
  if (error) {
    return (
      <div className="panel viz-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-dot" style={{ background: 'var(--color-error, #ef4444)' }}></span>
            Execution Diagnostics
          </div>
        </div>
        <div className="viz-content">
          <div className="error-banner">
            <div className="error-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="error-content">
              <div className="error-title">
                {error.errorType === 'compile' ? 'Compilation Error (GCC)' :
                 error.errorType === 'timeout' ? 'Execution Timeout (>10s)' :
                 error.errorType === 'stepcap' ? 'Step Limit Exceeded (500 steps)' :
                 'Runtime Exception (Crash / Segfault)'}
              </div>
              <div className="error-message">{error.error}</div>
              <div className="error-help">
                💡 Tip: Check for invalid pointer dereferences, array out-of-bound indexes, stack overflows, or infinite loops without termination conditions.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!event) {
    return (
      <div className="panel viz-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-dot"></span>
            Execution Visualizer
          </div>
        </div>
        <div className="viz-empty">
          <div className="viz-empty-card">
            <div className="viz-empty-icon-halo">
              <Sparkles size={32} className="spin-slow" />
            </div>
            <h3 className="viz-empty-title">Ready for Live Execution</h3>
            <p className="viz-empty-subtitle">
              Select an algorithm from the presets or write your own C code, then click <strong>Visualize</strong> (or press <kbd>Ctrl+Enter</kbd>) to watch your program execute line-by-line.
            </p>
            <div className="viz-feature-pills">
              <span className="pill">✨ 1D & 2D Arrays</span>
              <span className="pill">🎯 Pointers & Links</span>
              <span className="pill">📦 Struct Fields</span>
              <span className="pill">🔄 Recursion Tree</span>
              <span className="pill">💾 Heap malloc / free</span>
              <span className="pill">📊 Live Charts</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { eventType } = event;
  const isEndEvent = eventType === 'PROGRAM_END';

  return (
    <div className="panel viz-panel">
      {/* Tab bar header */}
      <div className="panel-header viz-tab-header">
        <div className="viz-tabs">
          <button
            className={`viz-tab-btn ${activeTab === 'canvas' ? 'active' : ''}`}
            onClick={() => setActiveTab('canvas')}
          >
            <LayoutGrid size={13} />
            <span>Visual Canvas</span>
          </button>

          <button
            className={`viz-tab-btn ${activeTab === 'trace' ? 'active' : ''}`}
            onClick={() => setActiveTab('trace')}
          >
            <ListTree size={13} />
            <span>Trace Log</span>
            <span className="tab-counter-badge">{timeline.length}</span>
          </button>

          <button
            className={`viz-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={13} />
            <span>Console (stdout)</span>
          </button>

          <button
            className={`viz-tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            <Layers size={13} />
            <span>Stack Frame</span>
          </button>

          <button
            className={`viz-tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <BarChart3 size={13} />
            <span>Charts</span>
          </button>
        </div>

        <div className="viz-header-status">
          <span className="status-live-indicator">
            <span className="status-ping"></span>
            <span className="status-dot"></span>
          </span>
          <span className="status-text">
            {isEndEvent ? 'Completed' : `L${event.line} • ${eventType?.replace(/_/g, ' ')}`}
          </span>
        </div>
      </div>

      <div className="viz-content">
        {/* Tab 1: Visual Canvas */}
        {activeTab === 'canvas' && (
          <VisualizationCanvas
            event={event}
            prevEvent={prevEvent}
            animationDuration={animationDuration}
            timeline={timeline}
            currentStep={currentStep}
          />
        )}

        {/* Tab 2: Trace Log */}
        {activeTab === 'trace' && (
          <ExecutionTraceLog
            timeline={timeline}
            currentStep={currentStep}
            onSelectStep={onSelectStep}
          />
        )}

        {/* Tab 3: Console Terminal */}
        {activeTab === 'terminal' && (
          <ConsoleTerminal
            timeline={timeline}
            currentStep={currentStep}
          />
        )}

        {/* Tab 4: Memory Stack */}
        {activeTab === 'memory' && (
          <StackDiagramView
            callStack={event.callStack || []}
            currentEvent={event}
            timeline={timeline}
            currentStep={currentStep}
            animationDuration={animationDuration}
          />
        )}

        {/* Tab 5: Charts */}
        {activeTab === 'charts' && (
          <div className="charts-tab-fullscreen">
            <ChartsPanel
              timeline={timeline}
              currentStep={currentStep}
            />
          </div>
        )}
      </div>
    </div>
  );
}
