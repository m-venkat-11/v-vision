import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCw, Play, CheckCircle2, XCircle, Zap, Activity, 
  ChevronRight, ChevronDown, ChevronUp, Terminal, TrendingUp, TrendingDown, Eye, HelpCircle,
  Sparkles, Layers
} from 'lucide-react';

/**
 * Filter out uninitialized C stack garbage numbers (e.g. 32767, -134542720, etc.)
 */
function isCleanValue(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'number') {
    if (isNaN(v)) return false;
    if (v === 32767 || v === -32768) return false;
    if (v === -134542720 || v === 4194432) return false;
    if (v === 2147483647 || v === -2147483648) return false;
    if (Math.abs(v) > 2000000) return false;
  }
  return true;
}

/**
 * IterationSpaceView — "Animated Loop Flow Stepper & Pedagogical Storyteller"
 * 
 * Benchmarked against top visualizers (VisuAlgo, Python Tutor, Brilliant):
 * 1. Animated 4-Stage Loop Pipeline: [Init] ➔ [Condition ?] ➔ [Loop Body] ➔ [Next Step]
 * 2. Visual glowing active stage token that travels with execution
 * 3. Human-friendly iteration narrative & verdict (NO compiler math substitution dumps)
 * 4. Zero stack garbage display: uninitialized numbers (32767, -134542720) are filtered out
 * 5. Intelligent detection of test cases (while(t > 0)) vs for-loop arrays
 * 6. Live step output (printf) & variable delta highlights
 */
export default function IterationSpaceView({
  event,
  timeline = [],
  currentStep = 0,
  animationDuration = 300
}) {
  const variables = event?.variables || {};
  const timelineChipsRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Analyze loop structure from timeline ──
  const loopAnalysis = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;

    const loopVarsOrdered = [];
    const varValueSets = {};

    for (const step of timeline) {
      if (step.loopState?.currentLoop?.variable) {
        const v = step.loopState.currentLoop.variable;
        if (!loopVarsOrdered.includes(v)) loopVarsOrdered.push(v);
      }
      if (step.loopState?.stack) {
        for (const frame of step.loopState.stack) {
          if (frame.variable && !loopVarsOrdered.includes(frame.variable)) {
            loopVarsOrdered.push(frame.variable);
          }
        }
      }
      if (step.variables) {
        for (const [k, val] of Object.entries(step.variables)) {
          if (typeof val === 'number' && isCleanValue(val)) {
            if (!varValueSets[k]) varValueSets[k] = new Set();
            varValueSets[k].add(val);
          }
        }
      }
    }

    // Typical loop index names that change
    const candidateVars = ['i', 'j', 'k', 'r', 'c', 't', 'idx', 'step', 'count'];
    for (const v of candidateVars) {
      if (varValueSets[v] && varValueSets[v].size > 1 && !loopVarsOrdered.includes(v)) {
        loopVarsOrdered.push(v);
      }
    }

    if (loopVarsOrdered.length === 0) {
      const changingVars = Object.entries(varValueSets)
        .filter(([, set]) => set.size > 1)
        .map(([k]) => k);
      if (changingVars.length >= 1) {
        loopVarsOrdered.push(...changingVars.slice(0, 2));
      }
    }

    // Build clean iterations list
    const iterations = [];
    let currentIteration = null;

    for (let s = 0; s < timeline.length; s++) {
      const step = timeline[s];
      const isLoopEvent = step.eventType === 'LOOP_STARTED' || step.eventType === 'LOOP_ITERATION';

      if (isLoopEvent) {
        if (currentIteration) {
          iterations.push(currentIteration);
        }
        const loopVar = step.loopState?.currentLoop?.variable || loopVarsOrdered[0] || 'loop';
        const rawVarVal = step.variables?.[loopVar];
        const loopVarValue = isCleanValue(rawVarVal) ? rawVarVal : null;
        const iterNum = step.loopState?.currentLoop?.iteration ?? iterations.length;

        currentIteration = {
          startStep: s,
          endStep: s,
          iterationNum: iterNum,
          loopVar,
          loopVarValue,
          bodySteps: [],
          variableChanges: [],
          condition: step.loopState?.currentLoop?.condition || '',
          loopType: step.loopState?.currentLoop?.type || 'for',
          isStart: step.eventType === 'LOOP_STARTED'
        };
      } else if (currentIteration) {
        currentIteration.endStep = s;
        currentIteration.bodySteps.push({
          step: s,
          sourceLine: step.sourceLine,
          eventType: step.eventType,
          stepOutput: step.stepOutput,
          changes: step.changes || [],
          why: step.why
        });

        if (step.changes && step.changes.length > 0) {
          currentIteration.variableChanges.push(...step.changes);
        }
      }
    }
    if (currentIteration) {
      iterations.push(currentIteration);
    }

    // Variable ranges (excluding garbage numbers)
    const varRanges = {};
    for (const v of loopVarsOrdered) {
      const vals = varValueSets[v] ? Array.from(varValueSets[v]).filter(isCleanValue).sort((a, b) => a - b) : [];
      if (vals.length > 0) {
        varRanges[v] = { min: vals[0], max: vals[vals.length - 1], values: vals };
      }
    }

    return {
      loopVars: loopVarsOrdered,
      isNested: loopVarsOrdered.length >= 2,
      iterations,
      varRanges,
      totalIterations: iterations.length
    };
  }, [timeline]);

  // Find current iteration from current step
  const currentIterationData = useMemo(() => {
    if (!loopAnalysis || loopAnalysis.iterations.length === 0) return null;
    const { iterations } = loopAnalysis;

    for (let i = iterations.length - 1; i >= 0; i--) {
      if (currentStep >= iterations[i].startStep && currentStep <= iterations[i].endStep) {
        return { ...iterations[i], index: i };
      }
    }
    if (iterations.length > 0 && currentStep > iterations[iterations.length - 1].endStep) {
      return { ...iterations[iterations.length - 1], index: iterations.length - 1 };
    }
    return { ...iterations[0], index: 0 };
  }, [loopAnalysis, currentStep]);

  // Auto-scroll timeline chips horizontally within their container ONLY (never scrolls parent page/canvas)
  useEffect(() => {
    if (timelineChipsRef.current && currentIterationData) {
      const container = timelineChipsRef.current;
      const chip = container.querySelector(`.flow-iter-chip[data-index="${currentIterationData.index}"]`);
      if (chip) {
        const containerRect = container.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        const scrollOffset = (chipRect.left - containerRect.left) + container.scrollLeft - (container.clientWidth / 2) + (chipRect.width / 2);
        container.scrollTo({ left: Math.max(0, scrollOffset), behavior: 'smooth' });
      }
    }
  }, [currentIterationData]);

  if (!loopAnalysis || loopAnalysis.iterations.length === 0) {
    return null;
  }

  const { loopVars, isNested, iterations, varRanges, totalIterations } = loopAnalysis;
  const curIter = currentIterationData;
  const currentIndex = curIter?.index ?? 0;

  // Clean condition expression
  const currentLoopState = event?.loopState?.currentLoop;
  let rawCond = currentLoopState?.condition || curIter?.condition || '';
  if (rawCond.includes(';')) {
    const parts = rawCond.replace(/^for\s*\(?/, '').replace(/\)?\s*\{?$/, '').split(';');
    if (parts.length >= 2 && parts[1].trim()) {
      rawCond = parts[1].trim();
    }
  } else if (/^(?:while|if)\s*\((.*)\)/.test(rawCond)) {
    const m = rawCond.match(/^(?:while|if)\s*\((.*)\)/);
    if (m?.[1]?.trim()) rawCond = m[1].trim();
  }

  // Detect loop variable & role
  const mainLoopVar = loopVars[0] || currentLoopState?.variable || 'i';
  const rawVarVal = variables[mainLoopVar];
  const mainVarVal = isCleanValue(rawVarVal) ? rawVarVal : null;
  const isTestCaseLoop = /^(?:t|test|cases|q)$/i.test(mainLoopVar) || /while\s*\(\s*(?:t\b|test|cases)/i.test(event?.sourceLine || curIter?.condition || '');

  // ── Determine Current Loop Stage in the 4-Stage Pipeline ──
  // 1. INIT: LOOP_STARTED
  // 2. CONDITION: LOOP_ITERATION, or line is loop header (for/while), or CONDITION_CHECKED
  // 3. STEP: Changes loop variable (e.g. i++, t--, i = i + 1)
  // 4. BODY: Normal body statements
  let currentStage = 'body';
  let currentStageIdx = 2; // 0: init, 1: condition, 2: body, 3: step

  const trimmedLine = (event?.sourceLine || '').trim();
  const isLoopHeaderLine = /^(for|while)\s*\(/.test(trimmedLine);
  const isStepChange = event?.changes?.some(c => loopVars.includes(c.name)) ||
    new RegExp(`(?:\\b${mainLoopVar}\\s*(?:\\+\\+|--|\\+=|-=)|(?:\\+\\+|--)\\s*${mainLoopVar}\\b)`).test(trimmedLine);

  if (event?.eventType === 'LOOP_STARTED') {
    currentStage = 'init';
    currentStageIdx = 0;
  } else if (event?.eventType === 'LOOP_ITERATION' || isLoopHeaderLine || event?.eventType === 'CONDITION_CHECKED') {
    currentStage = 'condition';
    currentStageIdx = 1;
  } else if (isStepChange) {
    currentStage = 'step';
    currentStageIdx = 3;
  } else {
    currentStage = 'body';
    currentStageIdx = 2;
  }

  // Evaluate condition substitution safely
  let condEvaluation = null;
  let condVerdict = null;
  if (rawCond) {
    let subExpr = rawCond;
    let hasGarbage = false;
    for (const [vName, vVal] of Object.entries(variables)) {
      if (new RegExp(`\\b${vName}\\b`).test(subExpr)) {
        if (!isCleanValue(vVal)) {
          hasGarbage = true;
          break;
        }
        subExpr = subExpr.replace(new RegExp(`\\b${vName}\\b`, 'g'), String(vVal));
      }
    }

    if (!hasGarbage && subExpr !== rawCond) {
      try {
        const sanitized = subExpr.replace(/[^0-9+\-*/<>=!&|() .]/g, '');
        if (sanitized.length > 0 && sanitized.length < 50) {
          condVerdict = Boolean(Function('"use strict"; return (' + sanitized + ')')());
          condEvaluation = `${rawCond}  ➔  ${subExpr}`;
        }
      } catch {
        condVerdict = null;
      }
    }
  }

  // Human Explanation for Current Step
  let narrativeText = '';
  if (event?.stepOutput) {
    narrativeText = `Console output generated: "${event.stepOutput.trim()}"`;
  } else if (currentStage === 'init') {
    narrativeText = isTestCaseLoop
      ? `Initializing test case execution with ${mainLoopVar} = ${mainVarVal ?? 1}.`
      : `Loop initialized. ${mainLoopVar} starts at ${mainVarVal ?? 0}.`;
  } else if (currentStage === 'condition') {
    if (condVerdict !== null) {
      narrativeText = condVerdict
        ? `Condition "${rawCond}" is TRUE. Continuing into iteration ${currentIndex + 1}.`
        : `Condition "${rawCond}" is FALSE. Loop boundary reached; exiting loop.`;
    } else {
      narrativeText = `Evaluating loop condition: ${rawCond || 'Checking bounds'}.`;
    }
  } else if (currentStage === 'step') {
    const change = event?.changes?.find(c => loopVars.includes(c.name));
    if (change) {
      narrativeText = `Updated loop counter ${change.name}: ${change.from} ➔ ${change.to}. Advancing to next pass.`;
    } else {
      narrativeText = `Updating loop variable and preparing next iteration cycle.`;
    }
  } else {
    narrativeText = event?.why || `Executing: ${trimmedLine}`;
  }

  // Clean active variables (filter out stack garbage)
  const cleanVariables = Object.entries(variables)
    .filter(([name, val]) => !['argc', 'argv'].includes(name) && isCleanValue(val));

  return (
    <div className="flow-loop-card">
      {/* ── Header: Title & Iteration Counter ── */}
      <div className="flow-loop-header">
        <div className="flow-title-group">
          <div className="flow-loop-badge">
            <RotateCw size={13} className="spin-slow flow-badge-icon" />
            <span>{isTestCaseLoop ? 'TEST CASE RUNNER' : `${(currentLoopState?.type || 'for').toUpperCase()} LOOP`}</span>
          </div>
          <div className="flow-iter-heading">
            <span className="flow-iter-title">
              {isTestCaseLoop 
                ? `Test Case #${currentIndex + 1}` 
                : `Iteration ${currentIndex + 1}${totalIterations > 1 ? ` of ${totalIterations}` : ''}`}
            </span>
            <span className="flow-iter-desc">
              {isTestCaseLoop ? (
                mainVarVal !== null ? `Remaining test cases: ${mainVarVal}` : 'Running test case'
              ) : (
                varRanges[mainLoopVar] ? (
                  `Index ${mainLoopVar} range: ${varRanges[mainLoopVar].min} → ${varRanges[mainLoopVar].max}`
                ) : (
                  rawCond ? `Condition: ${rawCond}` : 'Iterative pass'
                )
              )}
            </span>
          </div>
        </div>

        {/* Iteration count pill & collapse toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="flow-counter-pill">
            <span className="counter-curr">{currentIndex + 1}</span>
            <span className="counter-sep">/</span>
            <span className="counter-total">{Math.max(totalIterations, 1)}</span>
          </div>
          <button
            type="button"
            className="flow-collapse-btn"
            onClick={() => setIsCollapsed(prev => !prev)}
            title={isCollapsed ? "Expand Loop Flow Storyteller" : "Collapse Loop Flow Storyteller"}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: 'var(--text-secondary, #94a3b8)',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
      {/* ── 4-Stage Animated Loop Pipeline (Visual Flowchart) ── */}
      <div className="flow-pipeline-track">
        {/* Stage 1: Init */}
        <div className={`pipeline-stage ${currentStage === 'init' ? 'stage-active' : ''} ${currentStageIdx > 0 ? 'stage-completed' : ''}`}>
          <div className="stage-token">
            <Play size={12} className="stage-icon" />
          </div>
          <div className="stage-details">
            <span className="stage-name">1. Init</span>
            <span className="stage-sub">
              {mainVarVal !== null ? `${mainLoopVar} = ${mainVarVal}` : 'Start'}
            </span>
          </div>
        </div>

        <div className={`pipeline-connector ${currentStageIdx >= 1 ? 'conn-active' : ''}`}>
          <ChevronRight size={14} />
        </div>

        {/* Stage 2: Condition */}
        <div className={`pipeline-stage ${currentStage === 'condition' ? 'stage-active' : ''} ${condVerdict === false ? 'stage-exit' : (currentStageIdx > 1 ? 'stage-completed' : '')}`}>
          <div className="stage-token">
            {condVerdict === false ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
          </div>
          <div className="stage-details">
            <span className="stage-name">2. Condition</span>
            <span className="stage-sub" title={rawCond}>
              {rawCond ? (rawCond.length > 14 ? rawCond.slice(0, 12) + '…' : rawCond) : 'Valid?'}
            </span>
          </div>
        </div>

        <div className={`pipeline-connector ${currentStageIdx >= 2 ? 'conn-active' : ''}`}>
          <ChevronRight size={14} />
        </div>

        {/* Stage 3: Body */}
        <div className={`pipeline-stage ${currentStage === 'body' ? 'stage-active' : ''} ${currentStageIdx > 2 ? 'stage-completed' : ''}`}>
          <div className="stage-token">
            <Zap size={12} className="stage-icon" />
          </div>
          <div className="stage-details">
            <span className="stage-name">3. Loop Body</span>
            <span className="stage-sub">
              {event?.line ? `Line ${event.line}` : 'Execute'}
            </span>
          </div>
        </div>

        <div className={`pipeline-connector ${currentStageIdx >= 3 ? 'conn-active' : ''}`}>
          <ChevronRight size={14} />
        </div>

        {/* Stage 4: Next Step */}
        <div className={`pipeline-stage ${currentStage === 'step' ? 'stage-active' : ''}`}>
          <div className="stage-token">
            <RotateCw size={12} className="stage-icon" />
          </div>
          <div className="stage-details">
            <span className="stage-name">4. Next Step</span>
            <span className="stage-sub">
              {isTestCaseLoop ? `${mainLoopVar}--` : `${mainLoopVar}++`}
            </span>
          </div>
        </div>

        {/* Repeat Flow Indicator */}
        <div className="pipeline-repeat-badge" title="Cycles back to Condition Check">
          <RotateCw size={11} className="spin-slow" />
          <span>Repeat</span>
        </div>
      </div>

      {/* ── Unified Action & Narrative Card ── */}
      <div className="flow-narrative-card">
        <div className="narrative-top-row">
          <div className={`stage-status-chip stage-${currentStage}`}>
            {currentStage === 'init' && <Play size={11} />}
            {currentStage === 'condition' && <HelpCircle size={11} />}
            {currentStage === 'body' && <Activity size={11} />}
            {currentStage === 'step' && <TrendingUp size={11} />}
            <span>
              {currentStage === 'init' && 'Loop Entry & Initialization'}
              {currentStage === 'condition' && 'Testing Loop Condition'}
              {currentStage === 'body' && `Iteration ${currentIndex + 1} Body`}
              {currentStage === 'step' && 'Stepping to Next Iteration'}
            </span>
          </div>

          {event?.sourceLine && (
            <div className="flow-code-pill">
              <span className="flow-code-line">L{event.line}</span>
              <code className="flow-code-text">{event.sourceLine.trim()}</code>
            </div>
          )}
        </div>

        {/* Plain-English Action Description */}
        <div className="narrative-body-text">
          <p>{narrativeText}</p>
        </div>

        {/* Interactive Condition Comparison Pill (When at condition) */}
        {currentStage === 'condition' && rawCond && (
          <div className="flow-cond-banner">
            <span className="cond-banner-label">EVALUATING:</span>
            <code className="cond-banner-code">{rawCond}</code>
            {condEvaluation && (
              <>
                <ChevronRight size={12} className="cond-arrow" />
                <code className="cond-sub-code">{condEvaluation.split('➔')[1]?.trim()}</code>
              </>
            )}
            {condVerdict !== null && (
              <span className={`cond-verdict-pill ${condVerdict ? 'pass' : 'fail'}`}>
                {condVerdict ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                <span>{condVerdict ? 'TRUE (Continue)' : 'FALSE (Exit)'}</span>
              </span>
            )}
          </div>
        )}

        {/* Variable Changes in this step */}
        {event?.changes && event.changes.length > 0 && (
          <div className="flow-changes-row">
            <span className="changes-tag">MODIFIED:</span>
            {event.changes.map((c, idx) => {
              if (!isCleanValue(c.from) || !isCleanValue(c.to)) return null;
              const diff = (typeof c.from === 'number' && typeof c.to === 'number') ? c.to - c.from : null;
              return (
                <div key={idx} className="flow-change-badge">
                  <span className="change-var">{c.name}:</span>
                  <span className="change-old">{c.from}</span>
                  <span className="change-arrow">➔</span>
                  <span className="change-new">{c.to}</span>
                  {diff !== null && (
                    <span className={`change-delta ${diff >= 0 ? 'pos' : 'neg'}`}>
                      {diff >= 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Live stdout emitted at this exact step */}
        {event?.stepOutput && (
          <div className="flow-step-output">
            <div className="step-output-header">
              <Terminal size={12} />
              <span>Printed to Console at this step:</span>
            </div>
            <pre className="step-output-text">{event.stepOutput}</pre>
          </div>
        )}

        {/* Cumulative stdout panel if available */}
        {event?.stdout && (
          <div className="flow-console-snippet">
            <div className="console-snippet-header">
              <Terminal size={11} />
              <span>Program Console (stdout)</span>
            </div>
            <pre className="console-snippet-body">{event.stdout}</pre>
          </div>
        )}
      </div>

      {/* ── Active Initialized Variables (Clean Glassmorphic Pills, NO Garbage) ── */}
      {cleanVariables.length > 0 && (
        <div className="flow-vars-footer">
          <span className="vars-footer-label">ACTIVE STATE:</span>
          <div className="vars-footer-list">
            {cleanVariables.map(([name, val]) => {
              const isChanged = event?.changes?.some(c => c.name === name);
              const isMainLoop = loopVars.includes(name);
              return (
                <div 
                  key={name} 
                  className={`flow-var-chip ${isChanged ? 'chip-changed' : ''} ${isMainLoop ? 'chip-loop-var' : ''}`}
                >
                  <span className="var-chip-name">{name}</span>
                  <span className="var-chip-eq">=</span>
                  <span className="var-chip-val">
                    {typeof val === 'string' ? `"${val}"` : val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Iteration History Navigation Strip ── */}
      {iterations.length > 1 && (
        <div className="flow-history-strip-wrap">
          <div className="history-label">
            <Eye size={12} />
            <span>Iterations ({iterations.length})</span>
          </div>
          <div className="flow-history-strip" ref={timelineChipsRef}>
            {iterations.map((iter, idx) => {
              const isCur = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <div
                  key={idx}
                  data-index={idx}
                  className={`flow-iter-chip ${isCur ? 'chip-active' : ''} ${isPast ? 'chip-past' : ''}`}
                  title={`Iteration ${iter.iterationNum + 1}`}
                >
                  <span className="iter-chip-num">#{iter.iterationNum + 1}</span>
                  {iter.loopVarValue !== null && (
                    <span className="iter-chip-val">{iter.loopVar}={iter.loopVarValue}</span>
                  )}
                  {isCur && <span className="iter-chip-pulse" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
