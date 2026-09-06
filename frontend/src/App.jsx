import { useState, useCallback, useMemo } from 'react';
import CodeEditor from './components/CodeEditor';
import VisualizationPanel from './components/VisualizationPanel';
import WhyCaption from './components/WhyCaption';
import PlaybackControls from './components/PlaybackControls';
import { useTimelinePlayer } from './hooks/useTimelinePlayer';
import { EXAMPLE_PROGRAMS } from './data/examples';
import { Sparkles, Code2, Columns2, Rows2, RotateCcw, Cpu, BookOpen } from 'lucide-react';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_URL = RAW_API_URL.replace(/\/+$/, '').endsWith('/api')
  ? RAW_API_URL.replace(/\/+$/, '')
  : `${RAW_API_URL.replace(/\/+$/, '')}/api`;

function App() {
  const [selectedExampleId, setSelectedExampleId] = useState(EXAMPLE_PROGRAMS[0].id);
  const [code, setCode] = useState(EXAMPLE_PROGRAMS[0].code);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appState, setAppState] = useState('idle'); // idle | loading | visualizing
  const [layoutMode, setLayoutMode] = useState('columns'); // 'columns' | 'rows'

  const player = useTimelinePlayer();

  const currentExample = useMemo(() => {
    return EXAMPLE_PROGRAMS.find(p => p.id === selectedExampleId) || EXAMPLE_PROGRAMS[0];
  }, [selectedExampleId]);

  const handleVisualize = useCallback(async () => {
    if (!code?.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAppState('loading');
    player.setTimeline([]);

    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'c' }),
      });

      const data = await response.json();

      if (!data.success) {
        setError({
          error: data.error,
          errorType: data.errorType || 'unknown',
        });
        setAppState('idle');
        return;
      }

      if (data.timeline && data.timeline.length > 0) {
        player.setTimeline(data.timeline);
        setAppState('visualizing');
      } else {
        setError({
          error: 'No execution steps were captured. The program may have exited immediately.',
          errorType: 'runtime',
        });
        setAppState('idle');
      }
    } catch (err) {
      setError({
        error: `Failed to connect to execution engine at ${API_URL}.\n\nDetails: ${err.message}`,
        errorType: 'server',
      });
      setAppState('idle');
    } finally {
      setIsLoading(false);
    }
  }, [code, isLoading, player]);

  const handleExampleChange = useCallback((e) => {
    const exId = e.target.value;
    const example = EXAMPLE_PROGRAMS.find(p => p.id === exId);
    if (example) {
      setSelectedExampleId(exId);
      setCode(example.code);
      setError(null);
      setAppState('idle');
      player.setTimeline([]);
    }
  }, [player]);

  const handleResetEditor = useCallback(() => {
    setCode(currentExample.code);
    setError(null);
    setAppState('idle');
    player.setTimeline([]);
  }, [currentExample, player]);

  const currentLine = player.currentEvent?.line || null;

  return (
    <div className={`app layout-${layoutMode}`}>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <div className="app-logo-icon">
              <Cpu size={18} />
            </div>
            <div className="app-title-block">
              <span className="app-logo-text">V-VISION</span>
              <span className="app-logo-sub">Live C Execution Engine</span>
            </div>
            <span className="app-version-badge">v2.0 Pro</span>
          </div>

          <div className="header-divider"></div>

          {/* Preset Selector */}
          <div className="example-selector-wrap">
            <BookOpen size={14} className="selector-icon" />
            <select
              className="select-preset"
              value={selectedExampleId}
              onChange={handleExampleChange}
            >
              {EXAMPLE_PROGRAMS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.category}: {p.name} ({p.complexity})
                </option>
              ))}
            </select>
          </div>

          {currentExample && (
            <div className="example-description-pill" title={currentExample.description}>
              <span>{currentExample.description}</span>
            </div>
          )}
        </div>

        <div className="header-right">
          {/* Layout Mode Toggle */}
          <div className="layout-toggle-pills">
            <button
              className={`layout-btn ${layoutMode === 'columns' ? 'active' : ''}`}
              onClick={() => setLayoutMode('columns')}
              title="Side-by-side columns view"
            >
              <Columns2 size={14} />
            </button>
            <button
              className={`layout-btn ${layoutMode === 'rows' ? 'active' : ''}`}
              onClick={() => setLayoutMode('rows')}
              title="Stacked rows view"
            >
              <Rows2 size={14} />
            </button>
          </div>

          <button
            className="icon-btn-secondary"
            onClick={handleResetEditor}
            title="Reset code to default"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="app-main">
        <CodeEditor
          code={code}
          onCodeChange={setCode}
          highlightLine={appState === 'visualizing' ? currentLine : null}
          readOnly={appState === 'visualizing'}
          onVisualize={handleVisualize}
          isLoading={isLoading}
          breakpoints={player.breakpoints}
          onToggleBreakpoint={player.toggleBreakpoint}
          currentEvent={player.currentEvent}
        />

        <VisualizationPanel
          event={player.currentEvent}
          prevEvent={player.prevEvent}
          animationDuration={player.animationDuration}
          error={error}
          timeline={player.timeline}
          currentStep={player.currentStep}
          onSelectStep={player.goToStep}
        />
      </div>

      {/* Bottom Transport and Narrative Bar */}
      {(appState === 'visualizing' || error) && (
        <div className="bottom-bar">
          {player.currentEvent && (
            <WhyCaption
              event={player.currentEvent}
              step={player.currentStep}
              animationDuration={player.animationDuration}
            />
          )}

          {player.totalSteps > 0 && (
            <PlaybackControls
              currentStep={player.currentStep}
              totalSteps={player.totalSteps}
              isPlaying={player.isPlaying}
              speed={player.speed}
              stepDelay={player.stepDelay}
              stepProgress={player.stepProgress}
              breakpoints={player.breakpoints}
              onNext={player.next}
              onPrevious={player.previous}
              onPlay={player.play}
              onPause={player.pause}
              onReplay={player.replay}
              onJumpToStart={player.jumpToStart}
              onJumpToEnd={player.jumpToEnd}
              onSetSpeed={player.setSpeed}
              onGoToStep={player.goToStep}
              onRunToBreakpoint={player.runToBreakpoint}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
