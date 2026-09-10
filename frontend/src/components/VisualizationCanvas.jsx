import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Terminal } from 'lucide-react';
import ArrayView from './ArrayView';
import VariableView from './VariableView';
import PointerView from './PointerView';
import StructView from './StructView';
import StackDiagramView from './StackDiagramView';
import HeapView from './HeapView';
import LoopConditionStrip from './LoopConditionStrip';
import IterationSpaceView from './IterationSpaceView';

export default function VisualizationCanvas({
  event,
  prevEvent,
  animationDuration,
  timeline = [],
  currentStep = 0
}) {
  if (!event) return null;

  const { variables, arrays, structs, pointers, heapAllocations, callStack, eventType, highlight, arrayChanges, changes } = event;
  const isEndEvent = eventType === 'PROGRAM_END';

  // Detect which views are relevant across the program lifecycle
  const hasArrays = useMemo(() => {
    return arrays && Object.keys(arrays).length > 0;
  }, [arrays]);

  const hasPointers = useMemo(() => {
    return pointers && Object.keys(pointers).length > 0;
  }, [pointers]);

  const hasStructs = useMemo(() => {
    return structs && Object.keys(structs).length > 0;
  }, [structs]);

  const hasHeap = useMemo(() => {
    return heapAllocations && heapAllocations.length > 0;
  }, [heapAllocations]);

  const hasStackOrCalls = useMemo(() => {
    return (callStack && callStack.length > 1) || timeline.some(e => e.eventType === 'FUNCTION_CALLED' || e.eventType === 'RECURSIVE_CALL');
  }, [callStack, timeline]);

  // Check if loops exist anywhere in execution
  const hasLoops = useMemo(() => {
    return timeline.some(e => 
      e.eventType === 'LOOP_STARTED' || 
      e.eventType === 'LOOP_ITERATION' || 
      /^(for|while)\s*\(/.test(e.sourceLine?.trim() || '') ||
      (e.loopState && e.loopState.depth > 0)
    );
  }, [timeline]);

  // Pointer variables pointing to arrays
  const pointerVars = useMemo(() => {
    const pVars = {};
    if (variables && arrays) {
      for (const [arrName, arr] of Object.entries(arrays)) {
        const arrLen = Array.isArray(arr) ? arr.length : 0;
        for (const [vName, vVal] of Object.entries(variables)) {
          if (typeof vVal === 'number' && vVal >= 0 && vVal < arrLen) {
            const isIndex = ['i', 'j', 'k', 'idx', 'index', 'left', 'right', 'low', 'high', 'mid', 'target', 'found'].includes(vName) ||
              event.sourceLine?.includes(`[${vName}`) ||
              (event.loopState?.currentLoop?.variable === vName);
            if (isIndex) pVars[vName] = vVal;
          }
        }
      }
    }
    return pVars;
  }, [variables, arrays, event]);

  const hasAnySpatialDiagram = hasArrays || hasLoops || hasPointers || hasStructs || hasHeap || hasStackOrCalls;

  return (
    <div className="canvas-view-wrap">
      {/* 1. Array Iteration View (When program uses arrays) */}
      {hasArrays && (
        <ArrayView
          arrays={arrays}
          highlight={highlight}
          changes={arrayChanges}
          variables={variables}
          animationDuration={animationDuration}
          pointerVars={pointerVars}
        />
      )}

      {/* 2. Loop Storyteller — Shows for ALL programs with loops (teaches what the loop does) */}
      {hasLoops && (
        <IterationSpaceView
          event={event}
          timeline={timeline}
          currentStep={currentStep}
          animationDuration={animationDuration}
        />
      )}


      {/* Persistent Loop & Condition Status Strip — Smooth single-line indicator */}
      <LoopConditionStrip event={event} />

      {/* 3. Pointers & Memory Links */}
      {hasPointers && (
        <PointerView
          pointers={pointers}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* 4. Struct Instances View */}
      {hasStructs && (
        <StructView
          structs={structs}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* 5. Unified Stack Diagram View (Stack Frames + Recursion Tree) */}
      {hasStackOrCalls && (
        <StackDiagramView
          callStack={callStack || []}
          currentEvent={event}
          timeline={timeline}
          currentStep={currentStep}
          animationDuration={animationDuration}
        />
      )}

      {/* 6. Dynamic Heap Memory (malloc / free) */}
      {hasHeap && (
        <HeapView
          heapAllocations={heapAllocations}
          isProgramEnd={isEndEvent}
          memoryLeaks={event.memoryLeaks || []}
          animationDuration={animationDuration}
        />
      )}

      {/* 7. Variables fallback only when no spatial diagram exists, or as collapsed supporting reference */}
      {!hasAnySpatialDiagram && (
        <VariableView
          variables={variables}
          changes={changes}
          newVariables={event.newVariables}
          animationDuration={animationDuration}
        />
      )}

      {/* 8. Live Terminal Output: Shown when program produces stdout outside loop storyteller */}
      {event?.stdout && !hasLoops && (
        <div className="canvas-live-console">
          <div className="live-console-header">
            <div className="live-console-title">
              <Terminal size={13} className="console-icon" />
              <span>Program Output (stdout up to Step {currentStep + 1})</span>
            </div>
            {event.stepOutput && (
              <span className="live-console-step-badge">
                ▶ Line {event.line} just printed
              </span>
            )}
          </div>
          <pre className="live-console-content">{event.stdout}</pre>
        </div>
      )}

      {/* Program End Banner */}
      {isEndEvent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="program-end-banner"
        >
          <div className="end-icon-badge">
            <CheckCircle2 size={24} />
          </div>
          <div className="end-title">Program Execution Succeeded</div>
          <div className="end-subtitle">
            Reached return 0 with all iterations and calls complete. Review any step using the playback controls or Trace Log.
          </div>
        </motion.div>
      )}
    </div>
  );
}
