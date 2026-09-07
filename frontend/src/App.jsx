import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import VisualizationPanel from './components/VisualizationPanel';
import WhyCaption from './components/WhyCaption';
import PlaybackControls from './components/PlaybackControls';
import ModeTabs from './components/ModeTabs';
import QuestionInput from './components/QuestionInput';
import ExplanationPanel from './components/ExplanationPanel';
import { useTimelinePlayer } from './hooks/useTimelinePlayer';
import { EXAMPLE_PROGRAMS } from './data/examples';
import { Sparkles, Code2, Columns2, Rows2, RotateCcw, Cpu, BookOpen, GripVertical } from 'lucide-react';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_URL = RAW_API_URL.replace(/\/+$/, '').endsWith('/api')
  ? RAW_API_URL.replace(/\/+$/, '')
  : `${RAW_API_URL.replace(/\/+$/, '')}/api`;

function App() {
  const [activeMode, setActiveMode] = useState('code'); // 'code' | 'problem'
  const [selectedExampleId, setSelectedExampleId] = useState(EXAMPLE_PROGRAMS[0].id);
  const [code, setCode] = useState(EXAMPLE_PROGRAMS[0].code);
  const [isLoading, setIsLoading] = useState(false);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemData, setProblemData] = useState(null);
  const [error, setError] = useState(null);
  const [appState, setAppState] = useState('idle'); // idle | loading | visualizing
  const [layoutMode, setLayoutMode] = useState('columns'); // 'columns' | 'rows'

  // Resizable split panel width (in percentage)
  const [editorWidth, setEditorWidth] = useState(46);
  const isDraggingRef = useRef(false);

  const player = useTimelinePlayer();

  const currentExample = useMemo(() => {
    return EXAMPLE_PROGRAMS.find(p => p.id === selectedExampleId) || EXAMPLE_PROGRAMS[0];
  }, [selectedExampleId]);

  // Execute C Code via GCC/GDB Backend
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

  // Question Mode: Submit problem query
  const handleQuestionSubmit = useCallback(async (problemQuery) => {
    if (!problemQuery?.trim() || problemLoading) return;

    setProblemLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/explain-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: problemQuery }),
      });

      const data = await response.json();

      if (!data.success) {
        setError({
          error: data.error || 'Failed to explain problem',
          errorType: 'server'
        });
        return;
      }

      setProblemData(data);
      if (data.timeline && data.timeline.length > 0) {
        player.setTimeline(data.timeline);
        setAppState('visualizing');
      }
    } catch (err) {
      setError({
        error: `Failed to connect to problem engine.\n\nDetails: ${err.message}`,
        errorType: 'server',
      });
    } finally {
      setProblemLoading(false);
    }
  }, [problemLoading, player]);

  // Switch from Question Mode to Code Mode with starter code
  const handleTryCode = useCallback((starterCode) => {
    setCode(starterCode);
    setActiveMode('code');
    setAppState('idle');
    player.setTimeline([]);
  }, [player]);

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

  // Resizable Divider Handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const totalWidth = window.innerWidth;
      const newWidth = (moveEvent.clientX / totalWidth) * 100;
      if (newWidth >= 22 && newWidth <= 78) {
        setEditorWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const currentLine = player.currentEvent?.line || null;

  return (
    <div className={`app layout-${layoutMode}`}>
      {/* Top Navigation Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <div className="app-logo-icon">
              <Cpu size={18} />
            </div>
            <div className="app-title-block">
              <span className="app-logo-text">V-VISION</span>
              <span className="app-logo-sub">Execution & Problem Reasoning</span>
            </div>
            <span className="app-version-badge">v2.0 Pro</span>
          </div>

          <div className="header-divider"></div>

          {/* Mode Switcher Tabs */}
          <ModeTabs activeMode={activeMode} onSelectMode={setActiveMode} />

          {activeMode === 'code' && (
            <>
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
            </>
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

          {activeMode === 'code' && (
            <button
              className="icon-btn-secondary"
              onClick={handleResetEditor}
              title="Reset code to default"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Question Mode Search Banner (When in problem mode) */}
      {activeMode === 'problem' && (
        <QuestionInput
          onSubmitQuestion={handleQuestionSubmit}
          isLoading={problemLoading}
          currentProblemData={problemData}
          onTryCode={handleTryCode}
        />
      )}

      {/* Main Workspace Area */}
      <div className="app-main">
        {/* Left Side: Code Editor (shown in Code mode or alongside Problem mode) */}
        <div
          className="editor-split-pane"
          style={layoutMode === 'columns' ? { width: `${editorWidth}%` } : {}}
        >
          <CodeEditor
            code={code}
            onCodeChange={setCode}
            highlightLine={appState === 'visualizing' ? currentLine : null}
            isPlaying={player.isPlaying}
            isLoading={isLoading}
            onVisualize={handleVisualize}
            breakpoints={player.breakpoints}
            onToggleBreakpoint={player.toggleBreakpoint}
            currentEvent={player.currentEvent}
          />
        </div>

        {/* Resizable Divider (Columns mode only) */}
        {layoutMode === 'columns' && (
          <div
            className="resizable-divider"
            onMouseDown={handleMouseDown}
            title="Drag to resize panels"
          >
            <div className="divider-handle">
              <GripVertical size={14} />
            </div>
          </div>
        )}

        {/* Right Side: Visualization Panel & Explanation */}
        <div className="viz-split-pane">
          {/* Algorithm Plain-Language Explanation & Complexity Card */}
          <ExplanationPanel code={code} isVisible={activeMode === 'code' && !!code} />

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
      </div>

      {/* Bottom Transport and Narrative Caption Bar */}
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
