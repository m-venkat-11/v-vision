import { useMemo, useRef, useEffect } from 'react';
import { RotateCw, Zap, ChevronRight, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus, Activity, Eye, Terminal } from 'lucide-react';

/**
 * IterationSpaceView — "Step-by-Step Loop Storyteller"
 * 
 * Teaches how loops work through narrative, focused iteration cards:
 * 1. Loop Header — type, variable, range, circular progress ring
 * 2. Current Iteration Focus Card — variable spotlight + body narration
 * 3. Inline Condition Evaluator — expression → substitution → result  
 * 4. Iteration History Timeline — scrollable chips with summaries
 * 5. Variable Watch Panel — compact grid with change tracking
 */
export default function IterationSpaceView({
  event,
  timeline = [],
  currentStep = 0,
  animationDuration = 300
}) {
  const variables = event?.variables || {};
  const timelineChipsRef = useRef(null);

  // ── Analyze loop structure from entire timeline ──
  const loopAnalysis = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;

    const loopVarsOrdered = [];
    const varValueSets = {};

    // Scan steps for loop variables
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
          if (typeof val === 'number') {
            if (!varValueSets[k]) varValueSets[k] = new Set();
            varValueSets[k].add(val);
          }
        }
      }
    }

    // Fallback: typical loop var names that change
    const candidateVars = ['i', 'j', 'k', 'r', 'c', 'row', 'col', 'x', 'y', 'idx', 'step', 'count'];
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
      } else {
        return null;
      }
    }

    // Identify bound variables (n, m, size, etc.)
    const boundVars = [];
    const knownBoundNames = ['n', 'm', 'limit', 'size', 'len', 'total', 'cols', 'rows', 'width', 'height'];
    for (const b of knownBoundNames) {
      if (!loopVarsOrdered.includes(b)) {
        // Look for this bound across all steps
        for (const step of timeline) {
          if (step.variables && step.variables[b] !== undefined) {
            boundVars.push({ name: b, value: step.variables[b] });
            break;
          }
        }
      }
    }

    // Build iteration history from timeline
    const iterations = [];
    let currentIteration = null;

    for (let s = 0; s < timeline.length; s++) {
      const step = timeline[s];
      const isLoopEvent = step.eventType === 'LOOP_STARTED' || step.eventType === 'LOOP_ITERATION';

      if (isLoopEvent) {
        // Start a new iteration
        if (currentIteration) {
          iterations.push(currentIteration);
        }
        const loopVar = step.loopState?.currentLoop?.variable || loopVarsOrdered[0];
        const iterNum = step.loopState?.currentLoop?.iteration ?? iterations.length;

        currentIteration = {
          startStep: s,
          endStep: s,
          iterationNum: iterNum,
          loopVar,
          loopVarValue: step.variables?.[loopVar],
          nestedVars: {},
          bodySteps: [],
          variableChanges: [],
          condition: step.loopState?.currentLoop?.condition || '',
          loopType: step.loopState?.currentLoop?.type || 'for',
          isStart: step.eventType === 'LOOP_STARTED'
        };

        // Capture nested loop vars
        for (const v of loopVarsOrdered) {
          if (step.variables?.[v] !== undefined) {
            currentIteration.nestedVars[v] = step.variables[v];
          }
        }
      } else if (currentIteration) {
        currentIteration.endStep = s;
        currentIteration.bodySteps.push({
          step: s,
          sourceLine: step.sourceLine,
          eventType: step.eventType,
          stepOutput: step.stepOutput,
          changes: step.changes || [],
          arrayChanges: step.arrayChanges || [],
          conditionResult: step.conditionResult,
          why: step.why,
          variables: { ...step.variables }
        });

        // Track what changed
        if (step.changes && step.changes.length > 0) {
          currentIteration.variableChanges.push(...step.changes);
        }
        if (step.arrayChanges && step.arrayChanges.length > 0) {
          currentIteration.variableChanges.push(
            ...step.arrayChanges.map(ac => ({
              name: ac.row !== undefined ? `${ac.array}[${ac.row}][${ac.col}]` : `${ac.array}[${ac.index}]`,
              from: ac.from,
              to: ac.to,
              isArray: true
            }))
          );
        }
      }
    }
    if (currentIteration) {
      iterations.push(currentIteration);
    }

    // Determine ranges for loop vars
    const varRanges = {};
    for (const v of loopVarsOrdered) {
      const vals = varValueSets[v] ? Array.from(varValueSets[v]).sort((a, b) => a - b) : [];
      varRanges[v] = { min: vals[0] ?? 0, max: vals[vals.length - 1] ?? 0, values: vals };
    }

    return {
      loopVars: loopVarsOrdered,
      isNested: loopVarsOrdered.length >= 2,
      boundVars,
      iterations,
      varRanges,
      totalIterations: iterations.length
    };
  }, [timeline]);

  // ── Find which iteration we're currently in ──
  const currentIterationData = useMemo(() => {
    if (!loopAnalysis) return null;
    const { iterations } = loopAnalysis;

    // Find the iteration whose step range contains currentStep
    for (let i = iterations.length - 1; i >= 0; i--) {
      if (currentStep >= iterations[i].startStep && currentStep <= iterations[i].endStep) {
        return { ...iterations[i], index: i };
      }
    }
    // If currentStep is past all iterations, return the last one
    if (iterations.length > 0 && currentStep > iterations[iterations.length - 1].endStep) {
      return { ...iterations[iterations.length - 1], index: iterations.length - 1 };
    }
    // If before first iteration, return the first
    if (iterations.length > 0) {
      return { ...iterations[0], index: 0 };
    }
    return null;
  }, [loopAnalysis, currentStep]);

  // Auto-scroll timeline chips to keep current visible
  useEffect(() => {
    if (timelineChipsRef.current && currentIterationData) {
      const chip = timelineChipsRef.current.querySelector(`.iter-chip[data-index="${currentIterationData.index}"]`);
      if (chip) {
        chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIterationData]);

  if (!loopAnalysis || loopAnalysis.iterations.length === 0) {
    return null;
  }

  const { loopVars, isNested, boundVars, iterations, varRanges, totalIterations } = loopAnalysis;
  const curIter = currentIterationData;
  const currentIndex = curIter?.index ?? 0;
  const progressPercent = totalIterations > 0
    ? Math.min(100, Math.round(((currentIndex + 1) / totalIterations) * 100))
    : 0;

  // Get current event's loop state for condition evaluation
  const currentLoopState = event?.loopState?.currentLoop;
  let conditionExpr = currentLoopState?.condition || curIter?.condition || '';

  // Extract pure boolean condition from for/while headers (e.g. "int i = 0; i < n; i++" -> "i < n")
  if (conditionExpr.includes(';')) {
    const parts = conditionExpr.replace(/^for\s*\(?/, '').replace(/\)?\s*\{?$/, '').split(';');
    if (parts.length >= 2 && parts[1].trim()) {
      conditionExpr = parts[1].trim();
    }
  } else if (/^(?:while|if)\s*\((.*)\)/.test(conditionExpr)) {
    const match = conditionExpr.match(/^(?:while|if)\s*\((.*)\)/);
    if (match?.[1]?.trim()) {
      conditionExpr = match[1].trim();
    }
  }

  // Build condition substitution
  let condSubstitution = null;
  let condResult = null;
  if (conditionExpr) {
    condSubstitution = conditionExpr;
    // Replace known variables with their current values
    for (const [vName, vVal] of Object.entries(variables)) {
      if (typeof vVal === 'number') {
        // Use word boundary to replace variable names with values
        const regex = new RegExp(`\\b${vName}\\b`, 'g');
        const replaced = condSubstitution.replace(regex, String(vVal));
        if (replaced !== condSubstitution) {
          condSubstitution = replaced;
        }
      }
    }
    // If we made substitutions, try to evaluate
    if (condSubstitution !== conditionExpr) {
      try {
        // Simple safe evaluation for comparison expressions
        const sanitized = condSubstitution.replace(/[^0-9+\-*/<>=!&|() .]/g, '');
        if (sanitized.length > 0 && sanitized.length < 50) {
          condResult = Function('"use strict"; return (' + sanitized + ')')();
        }
      } catch {
        condResult = null;
      }
    }
  }

  // Generate narration for the current body step
  const currentBodyStep = curIter?.bodySteps?.find(bs => bs.step === currentStep);
  const isOnLoopHeader = event?.eventType === 'LOOP_STARTED' || event?.eventType === 'LOOP_ITERATION';

  // Build narration text
  let narrationText = '';
  if (event?.stepOutput) {
    narrationText = `Output printed: "${event.stepOutput.trim()}"`;
  } else if (currentBodyStep?.stepOutput) {
    narrationText = `Output printed: "${currentBodyStep.stepOutput.trim()}"`;
  } else if (isOnLoopHeader) {
    if (event.eventType === 'LOOP_STARTED') {
      narrationText = `Loop begins. ${loopVars[0]} starts at ${variables[loopVars[0]] ?? '?'}.`;
    } else {
      narrationText = `Checking loop condition before iteration ${(currentLoopState?.iteration ?? 0) + 1}.`;
    }
  } else if (currentBodyStep) {
    narrationText = currentBodyStep.why || `Executing: ${currentBodyStep.sourceLine}`;
  } else if (event?.why) {
    narrationText = event.why;
  }

  // Summarize what happened in past iterations (for chips)
  function getIterSummary(iter) {
    const outputStep = iter.bodySteps.find(s => s.stepOutput);
    if (outputStep) {
      return `output: "${outputStep.stepOutput.trim()}"`;
    }
    if (iter.variableChanges.length > 0) {
      const first = iter.variableChanges[0];
      return `${first.name}: ${first.from}→${first.to}`;
    }
    if (iter.bodySteps.length > 0) {
      const condStep = iter.bodySteps.find(s => s.conditionResult !== undefined && s.conditionResult !== null);
      if (condStep) {
        return condStep.conditionResult ? 'condition ✓' : 'condition ✗';
      }
    }
    return 'no change';
  }

  return (
    <div className="loop-storyteller">
      {/* ── 1. Loop Header Card ── */}
      <div className="loop-story-header">
        <div className="loop-story-title-area">
          <div className="loop-type-badge">
            <RotateCw size={14} className="spin-slow" />
            <span>{currentLoopState?.type?.toUpperCase() || 'FOR'} LOOP</span>
          </div>
          <div className="loop-story-title-info">
            {isNested ? (
              <div className="nested-loop-labels">
                <div className="nest-level outer">
                  <span className="nest-bracket">┌</span>
                  <span className="nest-label">Outer:</span>
                  <span className="nest-var">{loopVars[0]}</span>
                  <span className="nest-range">({varRanges[loopVars[0]]?.min} → {varRanges[loopVars[0]]?.max})</span>
                </div>
                <div className="nest-level inner">
                  <span className="nest-bracket">└</span>
                  <span className="nest-label">Inner:</span>
                  <span className="nest-var">{loopVars[1]}</span>
                  <span className="nest-range">({varRanges[loopVars[1]]?.min} → {varRanges[loopVars[1]]?.max})</span>
                </div>
              </div>
            ) : (
              <span className="loop-story-subtitle">
                Variable <span className="hl-var">{loopVars[0]}</span> iterates from{' '}
                <span className="hl-val">{varRanges[loopVars[0]]?.min}</span> to{' '}
                <span className="hl-val">{varRanges[loopVars[0]]?.max}</span>
              </span>
            )}
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="loop-progress-ring-wrap">
          <svg className="loop-progress-ring" viewBox="0 0 44 44">
            <circle className="ring-bg" cx="22" cy="22" r="18" fill="none" strokeWidth="3" />
            <circle
              className="ring-fill"
              cx="22" cy="22" r="18" fill="none" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - progressPercent / 100)}`}
              style={{ transition: `stroke-dashoffset ${animationDuration}ms ease` }}
            />
          </svg>
          <div className="ring-center-text">
            <span className="ring-num">{currentIndex + 1}</span>
            <span className="ring-sep">/</span>
            <span className="ring-total">{totalIterations}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Variable Spotlight ── */}
      <div className="var-spotlight-strip">
        {loopVars.map(v => {
          const val = variables[v];
          const prevVal = curIter?.bodySteps?.[0]?.variables?.[v];
          const changed = prevVal !== undefined && prevVal !== val;
          return (
            <div key={v} className={`var-spotlight-card ${changed ? 'spotlight-changed' : ''}`}>
              <span className="spotlight-name">{v}</span>
              <span className="spotlight-eq">=</span>
              <span className="spotlight-value">{val ?? '?'}</span>
              {isNested && (
                <span className="spotlight-role">
                  {v === loopVars[0] ? 'outer' : 'inner'}
                </span>
              )}
            </div>
          );
        })}
        {boundVars.map(b => (
          <div key={b.name} className="var-spotlight-card spotlight-bound">
            <span className="spotlight-name">{b.name}</span>
            <span className="spotlight-eq">=</span>
            <span className="spotlight-value">{b.value}</span>
            <span className="spotlight-role">bound</span>
          </div>
        ))}
      </div>

      {/* ── 3. Condition Evaluator ── */}
      {conditionExpr && (
        <div className="loop-condition-evaluator">
          <div className="cond-eval-flow">
            <div className="cond-eval-step">
              <span className="cond-eval-label">Condition</span>
              <code className="cond-eval-code">{conditionExpr}</code>
            </div>
            {condSubstitution && condSubstitution !== conditionExpr && (
              <>
                <ChevronRight size={14} className="cond-eval-arrow" />
                <div className="cond-eval-step substituted">
                  <span className="cond-eval-label">Substituted</span>
                  <code className="cond-eval-code">{condSubstitution}</code>
                </div>
              </>
            )}
            {condResult !== null && (
              <>
                <ChevronRight size={14} className="cond-eval-arrow" />
                <div className={`cond-eval-result ${condResult ? 'result-true' : 'result-false'}`}>
                  {condResult ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Continue Loop</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} />
                      <span>Exit Loop</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Focus Card: What's Happening NOW ── */}
      <div className="iteration-focus-card">
        <div className="focus-card-top">
          <div className="focus-badge">
            <Zap size={13} />
            <span>
              {isOnLoopHeader
                ? (event.eventType === 'LOOP_STARTED' ? 'Loop Initialization' : 'Condition Check')
                : `Iteration ${(currentLoopState?.iteration ?? currentIndex) + 1} — Body`
              }
            </span>
          </div>
          {event?.sourceLine && (
            <code className="focus-source-line">
              <span className="focus-line-num">L{event.line}</span>
              {event.sourceLine}
            </code>
          )}
        </div>

        <div className="focus-narration">
          <Activity size={15} className="narration-icon" />
          <p className="narration-text">{narrationText}</p>
        </div>

        {/* Inline variable changes for this step */}
        {event?.changes && event.changes.length > 0 && (
          <div className="focus-changes-strip">
            {event.changes.map((c, idx) => {
              const diff = (typeof c.from === 'number' && typeof c.to === 'number') ? c.to - c.from : null;
              return (
                <div key={idx} className="focus-change-pill">
                  <span className="change-var-name">{c.name}</span>
                  <span className="change-from">{c.from}</span>
                  <span className="change-arrow">→</span>
                  <span className="change-to">{c.to}</span>
                  {diff !== null && (
                    <span className={`change-diff ${diff >= 0 ? 'positive' : 'negative'}`}>
                      {diff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {diff >= 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step Output Banner: When printf or puts executes at this exact step */}
        {event?.stepOutput && (
          <div className="focus-output-banner">
            <div className="focus-output-badge">
              <Terminal size={12} />
              <span>Output printed at this step:</span>
            </div>
            <pre className="focus-output-text">{event.stepOutput}</pre>
          </div>
        )}
      </div>

      {/* ── 4b. Live Loop Console Output (stdout up to this step) ── */}
      {event?.stdout && (
        <div className="loop-stdout-panel">
          <div className="loop-stdout-header">
            <div className="loop-stdout-title">
              <Terminal size={13} className="stdout-icon" />
              <span>Console Output (stdout up to Step {currentStep + 1})</span>
            </div>
            {event.stepOutput && (
              <span className="stdout-just-emitted">
                ▶ Line {event.line} just printed
              </span>
            )}
          </div>
          <pre className="loop-stdout-content">{event.stdout}</pre>
        </div>
      )}

      {/* ── 5. Iteration History Timeline ── */}
      {iterations.length > 1 && (
        <div className="iteration-timeline-section">
          <div className="timeline-section-header">
            <Eye size={12} />
            <span>Iteration History</span>
            <span className="timeline-count">{iterations.length} iterations</span>
          </div>
          <div className="iteration-timeline-strip" ref={timelineChipsRef}>
            {iterations.map((iter, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              const isFuture = idx > currentIndex;
              const summary = getIterSummary(iter);

              return (
                <div
                  key={idx}
                  data-index={idx}
                  className={`iter-chip ${isCurrent ? 'chip-current' : ''} ${isPast ? 'chip-past' : ''} ${isFuture ? 'chip-future' : ''}`}
                  title={`Iteration ${iter.iterationNum + 1}: ${summary}`}
                >
                  <span className="chip-num">
                    {iter.iterationNum + 1}
                  </span>
                  <span className="chip-var-val">
                    {iter.loopVar}={iter.loopVarValue ?? '?'}
                  </span>
                  {isPast && (
                    <span className="chip-summary">{summary}</span>
                  )}
                  {isCurrent && (
                    <span className="chip-active-dot" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. Variable Watch Panel ── */}
      <div className="var-watch-panel">
        <div className="watch-panel-header">
          <span className="watch-title">Variable Watch</span>
        </div>
        <div className="watch-grid">
          {Object.entries(variables)
            .filter(([name]) => !['argc', 'argv'].includes(name))
            .map(([name, value]) => {
              const change = event?.changes?.find(c => c.name === name);
              const isLoopVar = loopVars.includes(name);
              return (
                <div
                  key={name}
                  className={`watch-cell ${change ? 'watch-changed' : ''} ${isLoopVar ? 'watch-loop-var' : ''}`}
                >
                  <span className="watch-name">{name}</span>
                  <span className="watch-value">{typeof value === 'number' ? value : String(value)}</span>
                  {change && (
                    <span className="watch-delta">
                      {typeof change.from === 'number' && typeof change.to === 'number'
                        ? (change.to - change.from >= 0 ? `+${change.to - change.from}` : `${change.to - change.from}`)
                        : `${change.from}→${change.to}`
                      }
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
