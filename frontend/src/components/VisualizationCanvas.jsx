import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Terminal, Sparkles, Layers, Cpu } from 'lucide-react';
import ArrayView from './ArrayView';
import VariableView from './VariableView';
import PointerView from './PointerView';
import StructView from './StructView';
import StackDiagramView from './StackDiagramView';
import HeapView from './HeapView';
import LoopConditionStrip from './LoopConditionStrip';
import IterationSpaceView from './IterationSpaceView';
import StackVisualizer from './StackVisualizer';
import QueueVisualizer from './QueueVisualizer';
import LinkedListView from './LinkedListView';
import TreeVisualizer from './TreeVisualizer';
import GraphVisualizer from './GraphVisualizer';
import HashTableVisualizer from './HashTableVisualizer';
import BitVisualizer from './BitVisualizer';
import DPVisualizer from './DPVisualizer';

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

  // Check for Tree Data Structure (struct with left/right or tree/root keywords)
  const hasTree = useMemo(() => {
    if (structs) {
      for (const [sName, sFields] of Object.entries(structs)) {
        if (typeof sFields === 'object' && ('left' in sFields || 'right' in sFields)) {
          return true;
        }
      }
    }
    return timeline.some(e => 
      /\b(TreeNode|BST|root|inorder|preorder|postorder|insertTree|searchTree)\b/i.test(e.sourceLine || '') ||
      (e.variables && ('root' in e.variables || 'tree' in e.variables))
    );
  }, [structs, timeline]);

  // Check for Graph Structure (adjacency list/matrix, graph/visited variables, bfs/dfs)
  const hasGraph = useMemo(() => {
    if (arrays) {
      for (const arrName of Object.keys(arrays)) {
        if (/graph|adj|visited|edges/i.test(arrName)) return true;
      }
    }
    return timeline.some(e => 
      /\b(bfs|dfs|dijkstra|add_edge|addEdge|adj\[|graph\[)\b/i.test(e.sourceLine || '') ||
      (e.variables && ('u' in e.variables && 'v' in e.variables))
    );
  }, [arrays, timeline]);

  // Check for Hash Table Structure (table/hashTable/bucket/modulo arithmetic)
  const hasHashTable = useMemo(() => {
    if (arrays) {
      for (const arrName of Object.keys(arrays)) {
        if (/hash|bucket|table\b/i.test(arrName)) return true;
      }
    }
    return timeline.some(e => 
      /\b(hash|hashCode|hashTable|key\s*%\s*|val\s*%\s*)\b/i.test(e.sourceLine || '')
    );
  }, [arrays, timeline]);

  // Check for Dynamic Programming (dp/fib/memo array or recurrence)
  const hasDP = useMemo(() => {
    if (arrays) {
      for (const arrName of Object.keys(arrays)) {
        if (/^dp\b|^fib\b|^memo\b|ways|cost/i.test(arrName)) return true;
      }
    }
    return timeline.some(e => 
      /\b(dp\[|fib\[|memo\[)\b/i.test(e.sourceLine || '')
    );
  }, [arrays, timeline]);

  // Check for Bit Manipulation (&, |, ^, <<, >>, ~, bitmask)
  const hasBitwise = useMemo(() => {
    return timeline.some(e => 
      /[&|^~]|<<|>>/.test(e.sourceLine || '') && !/&&|\|\|/.test(e.sourceLine || '') &&
      !/^\s*#include/.test(e.sourceLine || '')
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

  // Detect Stack Data Structure (array named stack/stk or top pointer)
  const stackData = useMemo(() => {
    if (arrays) {
      for (const [arrName, arr] of Object.entries(arrays)) {
        if (/stack|stk/i.test(arrName) || (variables && ('top' in variables || 'sp' in variables))) {
          const topVal = variables?.['top'] ?? variables?.['sp'] ?? (Array.isArray(arr) ? arr.length - 1 : 0);
          return {
            name: arrName,
            array: arr,
            top: typeof topVal === 'number' ? topVal : 0,
            capacity: Array.isArray(arr) ? arr.length : 10
          };
        }
      }
    }
    return null;
  }, [arrays, variables]);

  // Detect Queue Data Structure (array named queue/q or front/rear pointers)
  const queueData = useMemo(() => {
    if (arrays) {
      for (const [arrName, arr] of Object.entries(arrays)) {
        if (/queue|q\b/i.test(arrName) || (variables && ('front' in variables || 'rear' in variables))) {
          const frontVal = variables?.['front'] ?? variables?.['head'] ?? 0;
          const rearVal = variables?.['rear'] ?? variables?.['tail'] ?? (Array.isArray(arr) ? arr.length - 1 : 0);
          return {
            name: arrName,
            array: arr,
            front: typeof frontVal === 'number' ? frontVal : 0,
            rear: typeof rearVal === 'number' ? rearVal : 0,
            capacity: Array.isArray(arr) ? arr.length : 10
          };
        }
      }
    }
    return null;
  }, [arrays, variables]);

  // Detect Singly Linked List (structs with next/val or dynamic nodes)
  const linkedListNodes = useMemo(() => {
    if (!structs || Object.keys(structs).length === 0) return [];
    const nodes = [];
    for (const [sName, sFields] of Object.entries(structs)) {
      if (typeof sFields === 'object' && ('next' in sFields || 'data' in sFields || 'val' in sFields)) {
        nodes.push({
          name: sName,
          address: pointers?.[sName]?.targetAddress || pointers?.[sName]?.address || sName,
          data: sFields.data ?? sFields.val ?? sFields.value,
          next: sFields.next
        });
      }
    }
    return nodes;
  }, [structs, pointers]);

  // List of active detected topics for the adaptive composition ribbon
  const activeTopicsList = useMemo(() => {
    const list = [];
    if (hasGraph) list.push('Graph BFS/DFS');
    if (hasTree) list.push('Tree / BST');
    if (hasHashTable) list.push('Hash Table');
    if (hasDP) list.push('Dynamic Programming');
    if (hasBitwise) list.push('Bit Manipulation');
    if (stackData) list.push('Stack (LIFO)');
    if (queueData) list.push('Queue (FIFO)');
    if (linkedListNodes.length > 0) list.push('Linked List');
    if (hasArrays && !stackData && !queueData && !hasDP && !hasHashTable) list.push('Array');
    if (hasLoops) list.push('Loop Radar');
    if (hasPointers) list.push('Pointers');
    if (hasHeap) list.push('Dynamic Heap');
    return list;
  }, [hasGraph, hasTree, hasHashTable, hasDP, hasBitwise, stackData, queueData, linkedListNodes, hasArrays, hasLoops, hasPointers, hasHeap]);

  const hasAnySpatialDiagram = hasArrays || hasLoops || hasPointers || hasStructs || hasHeap || hasStackOrCalls || stackData || queueData || linkedListNodes.length > 0 || hasTree || hasGraph || hasHashTable || hasDP || hasBitwise;

  return (
    <div className="canvas-view-wrap">
      {/* Adaptive Multi-Topic Composition Ribbon */}
      {activeTopicsList.length > 1 && (
        <div className="multi-topic-composition-ribbon">
          <div className="ribbon-title">
            <Layers size={13} className="text-cyan" />
            <span>Adaptive Multi-Topic Composition ({activeTopicsList.length} Active):</span>
          </div>
          <div className="ribbon-pills">
            {activeTopicsList.map((t, idx) => (
              <span key={`topic-${idx}`} className="composition-pill">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1. Graph Visualizer (When Graph algorithms or adjacency structures exist) */}
      {hasGraph && (
        <GraphVisualizer
          event={event}
          variables={variables}
          arrays={arrays}
          animationDuration={animationDuration}
        />
      )}

      {/* 2. Tree Visualizer (When Tree / BST structures exist) */}
      {hasTree && (
        <TreeVisualizer
          event={event}
          variables={variables}
          structs={structs}
          animationDuration={animationDuration}
        />
      )}

      {/* 3. Hash Table Visualizer (When Hashing / Bucket mapping exists) */}
      {hasHashTable && (
        <HashTableVisualizer
          event={event}
          variables={variables}
          arrays={arrays}
          animationDuration={animationDuration}
        />
      )}

      {/* 4. Dynamic Programming Visualizer (When dp / memo / recurrence exists) */}
      {hasDP && (
        <DPVisualizer
          event={event}
          variables={variables}
          arrays={arrays}
          animationDuration={animationDuration}
        />
      )}

      {/* 5. Bit Manipulation Visualizer (When bitwise &, |, ^, shifts exist) */}
      {hasBitwise && (
        <BitVisualizer
          event={event}
          variables={variables}
          animationDuration={animationDuration}
        />
      )}

      {/* 6. Stack DSA Visualizer (Vertical LIFO Chamber) */}
      {stackData && (
        <StackVisualizer
          stackData={stackData}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* 7. Queue DSA Visualizer (Horizontal FIFO Conveyor) */}
      {queueData && (
        <QueueVisualizer
          queueData={queueData}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* 8. Linked List Visualizer (Chain of Nodes with Pointer Arrows) */}
      {linkedListNodes.length > 0 && (
        <LinkedListView
          nodes={linkedListNodes}
          pointers={pointers}
          variables={variables}
          event={event}
        />
      )}

      {/* 1. Array Iteration View (When program uses arrays not classified as stack/queue) */}
      {hasArrays && !stackData && !queueData && (
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

      {/* 8. Prominent Overall Program Output (Terminal stdout & Final Result) */}
      {(event?.stdout || (timeline.length > 0 && timeline[timeline.length - 1]?.stdout) || isEndEvent) && (
        <div className="canvas-overall-output-card">
          <div className="overall-output-header">
            <div className="overall-output-title">
              <Terminal size={14} className="terminal-icon" />
              <span>Overall Program Output (stdout)</span>
              {isEndEvent && (
                <span className="output-status-pill success">
                  <CheckCircle2 size={11} />
                  Execution Complete
                </span>
              )}
              {!isEndEvent && (
                <span className="output-status-pill running">
                  Live at Step {currentStep + 1} of {timeline.length}
                </span>
              )}
            </div>

            {event.stepOutput && (
              <div className="live-step-print-badge" title="Output printed at this line">
                <span className="print-arrow">▶</span>
                <span>Line {event.line} printed:</span>
                <code>{JSON.stringify(event.stepOutput).slice(1, -1)}</code>
              </div>
            )}
          </div>

          <div className="overall-output-body">
            {/* Live Terminal Output at this step */}
            <div className="output-terminal-display">
              <div className="terminal-bar">
                <span className="term-dot red"></span>
                <span className="term-dot yellow"></span>
                <span className="term-dot green"></span>
                <span className="term-title">Console Output (stdout)</span>
              </div>
              <pre className="terminal-text">
                {event?.stdout?.trim() 
                  ? event.stdout 
                  : (isEndEvent ? '(Program completed without stdout prints)' : '(Waiting for printf / output statements...)')}
              </pre>
            </div>

            {/* Overall Final Problem Output (shown when stepping through or completed) */}
            {timeline.length > 0 && timeline[timeline.length - 1]?.stdout?.trim() && (
              <div className="overall-final-summary">
                <div className="final-summary-header">
                  <Sparkles size={13} className="sparkle-icon" />
                  <span className="final-summary-title">Overall Final Result of Problem:</span>
                </div>
                <pre className="final-summary-output">
                  {timeline[timeline.length - 1].stdout.trim()}
                </pre>
              </div>
            )}
          </div>
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
