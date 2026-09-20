import { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Terminal, 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Clipboard, 
  Trash2, 
  Smartphone, 
  Monitor,
  Code2
} from 'lucide-react';

export default function CodeEditor({ 
  code, 
  onCodeChange, 
  customInput = '',
  onCustomInputChange,
  highlightLine, 
  isPlaying,     // ← only read-only when ACTIVELY playing
  isLoading,
  onVisualize, 
  breakpoints = new Set(),
  onToggleBreakpoint,
  currentEvent
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const mobileTextareaRef = useRef(null);
  const mobileGutterRef = useRef(null);
  const lineDecorationsRef = useRef([]);
  const breakpointDecorationsRef = useRef([]);
  const [fontSize, setFontSize] = useState(13.5);

  // Editor mode: 'monaco' vs 'mobile' (auto-detects mobile screens <= 768px)
  const [editorMode, setEditorMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'mobile';
    }
    return 'monaco';
  });

  const [copySuccess, setCopySuccess] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteModalText, setPasteModalText] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');

  const hasInputCall = /scanf|getchar|getc|fgets|cin/.test(code || '');
  const [isInputOpen, setIsInputOpen] = useState(false);

  // Show temporary toast notification
  const showNotification = useCallback((msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 2500);
  }, []);

  // 1-Tap Copy All Code
  const handleCopyAll = useCallback(async () => {
    if (!code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      showNotification('✓ Code copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      showNotification('Failed to copy. Please select text manually.');
    }
  }, [code, showNotification]);

  // 1-Tap Paste Code
  const handlePasteCode = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onCodeChange(text);
          showNotification('✓ Code pasted successfully!');
          return;
        }
      }
      // If clipboard read was empty or blocked by browser permissions, open native paste drawer
      setPasteModalText('');
      setPasteModalOpen(true);
    } catch (err) {
      // Permission denied or touch browser security block → open paste modal fallback
      setPasteModalText('');
      setPasteModalOpen(true);
    }
  }, [onCodeChange, showNotification]);

  // Apply code from paste modal
  const handleApplyPastedModal = useCallback(() => {
    if (pasteModalText.trim()) {
      onCodeChange(pasteModalText);
      showNotification('✓ Code pasted successfully!');
    }
    setPasteModalOpen(false);
    setPasteModalText('');
  }, [pasteModalText, onCodeChange, showNotification]);

  // Clear code
  const handleClearCode = useCallback(() => {
    if (window.confirm('Clear all code in the editor?')) {
      onCodeChange('');
      showNotification('Editor cleared');
    }
  }, [onCodeChange, showNotification]);

  // Sync scroll for mobile line numbers gutter
  const handleMobileScroll = useCallback((e) => {
    if (mobileGutterRef.current) {
      mobileGutterRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  // Handle Tab key in mobile textarea
  const handleMobileKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '    ' + val.substring(end);
      onCodeChange(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  }, [onCodeChange]);

  // Auto-open input drawer when scanf / getchar is detected
  useEffect(() => {
    if (hasInputCall) {
      setIsInputOpen(true);
    }
  }, [hasInputCall]);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Rich dark theme
    monaco.editor.defineTheme('visualcode-dark-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',         foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword',         foreground: '818cf8', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'c084fc', fontStyle: 'bold' },
        { token: 'number',          foreground: 'fbbf24' },
        { token: 'string',          foreground: '34d399' },
        { token: 'type',            foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'identifier',      foreground: 'f1f5f9' },
        { token: 'delimiter',       foreground: '94a3b8' },
        { token: 'operator',        foreground: 'f472b6' },
      ],
      colors: {
        'editor.background':                '#090a12',
        'editor.foreground':                '#f1f5f9',
        'editor.lineHighlightBackground':   '#14172b',
        'editorLineNumber.foreground':      '#475569',
        'editorLineNumber.activeForeground':'#a5b4fc',
        'editorGutter.background':          '#07080f',
        'editor.selectionBackground':       '#6366f140',
        'editor.inactiveSelectionBackground':'#6366f11f',
        'editorCursor.foreground':          '#818cf8',
        'scrollbar.shadow':                 '#00000000',
        'editorScrollbar.background':       '#00000000',
        'editorScrollbar.sliderBackground': '#33415533',
        'editorScrollbar.sliderHoverBackground': '#47556966',
      }
    });
    monaco.editor.setTheme('visualcode-dark-pro');

    // Gutter click → toggle breakpoint
    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line && onToggleBreakpoint) onToggleBreakpoint(line);
      }
    });

    // Ctrl+Enter → Visualize
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onVisualize?.();
    });
  }, [onToggleBreakpoint, onVisualize]);

  // Execution line highlight decoration — purely visual, does NOT block editing
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (highlightLine) {
      lineDecorationsRef.current = editor.deltaDecorations(
        lineDecorationsRef.current,
        [{
          range: new monaco.Range(highlightLine, 1, highlightLine, 1),
          options: {
            isWholeLine: true,
            className: 'current-exec-line',
            glyphMarginClassName: 'current-exec-glyph',
            linesDecorationsClassName: 'current-exec-gutter',
          }
        }]
      );
      editor.revealLineInCenterIfOutsideViewport(highlightLine);
    } else {
      lineDecorationsRef.current = editor.deltaDecorations(lineDecorationsRef.current, []);
    }
  }, [highlightLine]);

  // Breakpoint decorations
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decs = Array.from(breakpoints).map(line => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'breakpoint-glyph',
        linesDecorationsClassName: 'breakpoint-gutter-dot',
      }
    }));
    breakpointDecorationsRef.current = editor.deltaDecorations(breakpointDecorationsRef.current, decs);
  }, [breakpoints]);

  const activeVars = currentEvent?.variables
    ? Object.entries(currentEvent.variables)
        .filter(([k]) => !['argc', 'argv'].includes(k))
        .slice(0, 4)
    : [];

  const linesCount = (code || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(linesCount, 1) }, (_, i) => i + 1);

  return (
    <div className="panel code-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-title">
            <span className="panel-title-dot"></span>
            C Source Code
          </div>
          {highlightLine && (
            <div className="active-line-badge">
              <span className="pulse-dot"></span>
              Line {highlightLine}
              {isPlaying ? ' ▶ Playing' : ' ⏸ Paused'}
            </div>
          )}
          {breakpoints.size > 0 && (
            <div className="breakpoint-count-badge" title="Click line number to toggle breakpoints">
              🔴 {breakpoints.size} {breakpoints.size === 1 ? 'break' : 'breaks'}
            </div>
          )}
        </div>

        <div className="panel-actions">
          <div className="font-size-controls">
            <button
              className="icon-btn-ghost"
              onClick={() => setFontSize(s => Math.max(11, s - 1))}
              title="Decrease font size"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-size-label">{Math.round(fontSize)}px</span>
            <button
              className="icon-btn-ghost"
              onClick={() => setFontSize(s => Math.min(20, s + 1))}
              title="Increase font size"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            className={`btn-input-toggle ${isInputOpen ? 'active' : ''} ${hasInputCall ? 'highlight-scanf' : ''}`}
            onClick={() => setIsInputOpen(v => !v)}
            title="Configure Standard Input (stdin) for scanf / getchar"
          >
            <Terminal size={13} />
            <span>Input (stdin)</span>
            {hasInputCall && (
              <span className="input-detect-dot" title="scanf() detected in code" />
            )}
            {customInput?.trim() && !hasInputCall && (
              <span className="input-has-data-dot" title="Custom input provided" />
            )}
          </button>

          <button
            className="btn btn-primary"
            onClick={onVisualize}
            disabled={isLoading || !code?.trim()}
            id="visualize-btn"
            title="Compile & step through live (Ctrl+Enter)"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner-sm"></span>
                <span>Compiling GDB...</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Visualize</span>
                <kbd className="kbd-shortcut">Ctrl ↵</kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1-Tap Quick Action Toolbar (Mobile & Desktop) */}
      <div className="editor-quick-toolbar">
        <div className="quick-toolbar-left">
          <button
            type="button"
            className={`toolbar-action-btn ${copySuccess ? 'btn-success-flash' : ''}`}
            onClick={handleCopyAll}
            title="Copy whole code to clipboard (1-tap)"
          >
            {copySuccess ? <Check size={13} /> : <Copy size={13} />}
            <span>{copySuccess ? 'Copied!' : 'Copy All'}</span>
          </button>

          <button
            type="button"
            className="toolbar-action-btn"
            onClick={handlePasteCode}
            title="Paste code from clipboard (1-tap)"
          >
            <Clipboard size={13} />
            <span>Paste Code</span>
          </button>

          <button
            type="button"
            className="toolbar-action-btn btn-ghost-subtle"
            onClick={handleClearCode}
            title="Clear all code"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>

        <div className="quick-toolbar-right">
          {/* Toggle between Monaco Editor and Mobile-Friendly Native Editor */}
          <button
            type="button"
            className={`editor-mode-toggle-btn ${editorMode === 'mobile' ? 'mode-mobile' : 'mode-monaco'}`}
            onClick={() => setEditorMode(m => m === 'mobile' ? 'monaco' : 'mobile')}
            title={editorMode === 'mobile' ? 'Switch to Monaco Pro Editor' : 'Switch to Lightweight Mobile Editor'}
          >
            {editorMode === 'mobile' ? (
              <>
                <Smartphone size={13} />
                <span>Mobile Editor</span>
                <span className="mode-switch-tag">Switch to Monaco</span>
              </>
            ) : (
              <>
                <Monitor size={13} />
                <span>Monaco Pro</span>
                <span className="mode-switch-tag">Switch to Mobile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification Bar */}
      {notificationMsg && (
        <div className="editor-toast-notification">
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Code Editor Body */}
      <div className="editor-wrapper">
        {editorMode === 'mobile' ? (
          /* High-Performance Mobile Native Editor with Synced Line Numbers */
          <div className="mobile-editor-container">
            <div 
              ref={mobileGutterRef} 
              className="mobile-editor-gutter"
              style={{ fontSize: `${fontSize}px` }}
            >
              {lineNumbers.map(n => (
                <div 
                  key={n} 
                  className={`mobile-gutter-line ${highlightLine === n ? 'active-gutter-line' : ''} ${breakpoints.has(n) ? 'breakpoint-gutter-line' : ''}`}
                  onClick={() => onToggleBreakpoint?.(n)}
                >
                  {breakpoints.has(n) && <span className="mobile-breakpoint-dot">●</span>}
                  <span>{n}</span>
                </div>
              ))}
            </div>

            <textarea
              ref={mobileTextareaRef}
              className="mobile-editor-textarea"
              style={{ fontSize: `${fontSize}px` }}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onScroll={handleMobileScroll}
              onKeyDown={handleMobileKeyDown}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              readOnly={isPlaying || isLoading}
              placeholder="Type or paste your C code here..."
            />
          </div>
        ) : (
          /* Desktop Monaco Pro Editor */
          <div className="monaco-container">
            <Editor
              height="100%"
              defaultLanguage="c"
              value={code}
              onChange={onCodeChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: true,
                folding: false,
                lineDecorationsWidth: 14,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'none',
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                padding: { top: 14, bottom: 14 },
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                readOnly: isLoading || isPlaying || false,
                contextmenu: true,
              }}
              theme="visualcode-dark-pro"
            />
          </div>
        )}

        {/* Live execution overlay — shown only when visualizing */}
        {highlightLine && currentEvent && (
          <div className="editor-live-status-bar">
            <div className="editor-status-left">
              <span className="exec-arrow">▶</span>
              <span className="exec-line-text">
                {currentEvent.sourceLine || `Line ${highlightLine}`}
              </span>
            </div>
            {activeVars.length > 0 && (
              <div className="editor-status-vars">
                {activeVars.map(([k, v]) => (
                  <span key={k} className="inline-var-pill">
                    <span className="var-key">{k}:</span>
                    <span className="var-val">{typeof v === 'number' ? v : JSON.stringify(v)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Standard Input (stdin) Drawer */}
        {isInputOpen && (
          <div className="editor-stdin-drawer">
            <div className="stdin-drawer-header">
              <div className="stdin-header-left">
                <Terminal size={13} className="stdin-icon" />
                <span className="stdin-title">Standard Input (stdin)</span>
                {hasInputCall ? (
                  <span className="stdin-badge-detected">
                    <Sparkles size={11} />
                    scanf() active
                  </span>
                ) : (
                  <span className="stdin-badge-optional">Optional</span>
                )}
              </div>
              <div className="stdin-header-right">
                <span className="stdin-hint">Inputs for scanf() — space or newline separated</span>
                {customInput ? (
                  <button
                    type="button"
                    className="stdin-action-btn"
                    onClick={() => onCustomInputChange?.('')}
                    title="Clear input"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  className="stdin-close-btn"
                  onClick={() => setIsInputOpen(false)}
                  title="Hide input panel"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="stdin-textarea-wrap">
              <textarea
                className="stdin-textarea"
                value={customInput || ''}
                onChange={(e) => onCustomInputChange?.(e.target.value)}
                placeholder={`Enter inputs for scanf() here...\nExample for reading array elements:\n5\n12 45 7 23 9`}
                rows={3}
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Mobile / Fallback Paste Modal Drawer */}
        {pasteModalOpen && (
          <div className="paste-modal-backdrop" onClick={() => setPasteModalOpen(false)}>
            <div className="paste-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="paste-modal-header">
                <div className="paste-modal-title">
                  <Clipboard size={16} />
                  <span>Paste Code from Device</span>
                </div>
                <button 
                  className="icon-btn-ghost" 
                  onClick={() => setPasteModalOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <p className="paste-modal-instruction">
                Long-press inside the box below and tap <strong>Paste</strong>, then click <strong>Insert Code</strong>:
              </p>
              <textarea
                className="paste-modal-textarea"
                value={pasteModalText}
                onChange={(e) => setPasteModalText(e.target.value)}
                placeholder="Long-press here and tap Paste..."
                autoFocus
                rows={8}
                spellCheck={false}
              />
              <div className="paste-modal-actions">
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => setPasteModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={handleApplyPastedModal}
                  disabled={!pasteModalText.trim()}
                >
                  <Check size={14} />
                  <span>Insert Code Into Editor</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
