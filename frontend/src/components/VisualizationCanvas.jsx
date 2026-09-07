import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import ArrayView from './ArrayView';
import VariableView from './VariableView';
import PointerView from './PointerView';
import StructView from './StructView';
import StackDiagramView from './StackDiagramView';
import HeapView from './HeapView';
import LoopConditionStrip from './LoopConditionStrip';

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

  return (
    <div className="canvas-view-wrap">
      {/* 1D & 2D Arrays View — Pinned at the top for rock-solid vertical stability */}
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

      {/* Persistent Loop & Condition Status Strip — Smooth single-line indicator */}
      <LoopConditionStrip event={event} />

      {/* Pointers & Memory Links */}
      {hasPointers && (
        <PointerView
          pointers={pointers}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* Struct Instances View */}
      {hasStructs && (
        <StructView
          structs={structs}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* Unified Stack Diagram View (Stack Frames + Recursion Tree Toggle) */}
      {hasStackOrCalls && (
        <StackDiagramView
          callStack={callStack || []}
          currentEvent={event}
          timeline={timeline}
          currentStep={currentStep}
          animationDuration={animationDuration}
        />
      )}

      {/* Dynamic Heap Memory (malloc / free) */}
      {hasHeap && (
        <HeapView
          heapAllocations={heapAllocations}
          isProgramEnd={isEndEvent}
          memoryLeaks={event.memoryLeaks || []}
          animationDuration={animationDuration}
        />
      )}

      {/* Variables & Registers */}
      <VariableView
        variables={variables}
        changes={changes}
        newVariables={event.newVariables}
        animationDuration={animationDuration}
      />


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
