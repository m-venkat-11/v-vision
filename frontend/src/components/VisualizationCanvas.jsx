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
import LoopView from './LoopView';
import ConditionView from './ConditionView';
import IterationSpaceView from './IterationSpaceView';
import StackVisualizer from './StackVisualizer';
import QueueVisualizer from './QueueVisualizer';
import LinkedListView from './LinkedListView';
import TreeVisualizer from './TreeVisualizer';
import GraphVisualizer from './GraphVisualizer';
import HashTableVisualizer from './HashTableVisualizer';
import BitVisualizer from './BitVisualizer';
import DPVisualizer from './DPVisualizer';
import RecursionVisualizer from './RecursionVisualizer';
import RecursionTreeView from './RecursionTreeView';
import PointerSwapVisualizer from './PointerSwapVisualizer';

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

  // Detect Recursion (self-calling function or RECURSIVE_CALL events)
  const hasRecursion = useMemo(() => {
    // 1. Explicit recursive call events
    const hasRecEvent = timeline.some(e =>
      e.eventType === 'RECURSIVE_CALL' || e.eventType === 'FUNCTION_ENTERED'
    );
    if (hasRecEvent) return true;

    // 2. Same function appears at multiple depths in any callStack snapshot
    const seenFuncAtMultipleDepths = timeline.some(e => {
      if (!Array.isArray(e.callStack) || e.callStack.length < 2) return false;
      const funcs = e.callStack.map(f => f.func || '').filter(f => f && f !== 'main' && !f.startsWith('__'));
      const unique = new Set(funcs);
      // If fewer unique funcs than total funcs, a function is repeated (recursive)
      return unique.size > 0 && unique.size < funcs.length;
    });
    if (seenFuncAtMultipleDepths) return true;

    // 3. Pattern: a function that calls itself (factorial(n-1), fib(n-1), etc.)
    return timeline.some(e => {
      if (!e.function || !e.sourceLine) return false;
      const fn = e.function;
      return new RegExp(`\\b${fn}\\s*\\(`).test(e.sourceLine) && fn !== 'main';
    });
  }, [timeline]);

  // Detect Pointer Swap program (swap function with pointer params, no real bitwise)
  const hasPointerSwap = useMemo(() => {
    const hasSwapFunc = timeline.some(e =>
      /void\s+swap|swap\s*\(\s*&|\*a\s*=|\*b\s*=|temp\s*=\s*\*/.test(e.sourceLine || '')
    );
    return hasSwapFunc && !hasRecursion;
  }, [timeline, hasRecursion]);

  // Check for Bit Manipulation (&, |, ^, <<, >>, ~, bitmask)
  // Strictly disabled when this is a pointer swap program
  const hasBitwise = useMemo(() => {
    if (hasPointerSwap) return false;
    return timeline.some(e => {
      const line = e.sourceLine || '';
      if (/^\s*#include/.test(line)) return false;
      if (/&&|\|\|/.test(line)) return false; // logical, not bitwise
      if (/swap\s*\(/.test(line)) return false;
      // Strip address-of occurrences: &varname inside function args or assignments
      const stripped = line.replace(/[(&,\s]&\w+/g, ' ');
      // Now check for real binary bitwise ops: a & b, a | b, a ^ b, ~a, <<, >>
      return /\w\s*[&|^]\s*\w|<<|>>|~\w/.test(stripped);
    });
  }, [timeline, hasPointerSwap]);

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

  // Detect Stack Data Structure (array named stack/stk or top pointer with push/pop operations)
  const stackData = useMemo(() => {
    // Check if stack exists anywhere in execution
    const hasExplicitStackArray = timeline.some(e => e.arrays && Object.keys(e.arrays).some(k => /^(stack|stk)\b/i.test(k)));
    const hasTopWithPushPop = timeline.some(e => e.variables && ('top' in e.variables || 'sp' in e.variables)) &&
                              timeline.some(e => /\b(push|pop|stack|stk)\b/i.test(e.sourceLine || ''));
    if (!hasExplicitStackArray && !hasTopWithPushPop) return null;

    let stackName = 'stack';
    let capacity = 5;
    for (const ev of timeline) {
      if (ev.arrays) {
        for (const [k, arr] of Object.entries(ev.arrays)) {
          if (/^(stack|stk)\b/i.test(k) && Array.isArray(arr) && arr.length > 0) {
            stackName = k;
            capacity = arr.length;
            break;
          }
        }
      }
    }

    let currentTop = -1;
    for (let i = currentStep; i >= 0; i--) {
      const ev = timeline[i];
      if (ev?.variables && ('top' in ev.variables || 'sp' in ev.variables)) {
        const t = ev.variables['top'] ?? ev.variables['sp'];
        if (typeof t === 'number' && Math.abs(t) < 1000) {
          currentTop = t;
          break;
        }
      }
    }

    let currentArray = null;
    for (let i = currentStep; i >= 0; i--) {
      const ev = timeline[i];
      if (ev?.arrays?.[stackName] && Array.isArray(ev.arrays[stackName])) {
        currentArray = ev.arrays[stackName];
        break;
      }
    }
    if (!currentArray || currentArray.length === 0) {
      currentArray = new Array(Math.max(capacity, (currentTop >= 0 ? currentTop + 1 : 0))).fill(0);
    }

    return {
      name: stackName,
      array: currentArray,
      top: currentTop,
      capacity: Math.max(capacity, currentArray.length)
    };
  }, [arrays, variables, timeline, currentStep]);


  // Detect Queue Data Structure (array named queue/q or front/rear pointers)
  const queueData = useMemo(() => {
    const hasQueueArray = timeline.some(e => e.arrays && Object.keys(e.arrays).some(k => /^(queue|q)\b/i.test(k))) ||
                          timeline.some(e => e.variables && (('front' in e.variables && 'rear' in e.variables) || ('head' in e.variables && 'tail' in e.variables)));
    if (!hasQueueArray) return null;

    let queueName = 'queue';
    let capacity = 5;
    for (const ev of timeline) {
      if (ev.arrays) {
        for (const [k, arr] of Object.entries(ev.arrays)) {
          if (/^(queue|q)\b/i.test(k) && Array.isArray(arr)) {
            queueName = k;
            capacity = arr.length;
            break;
          }
        }
      }
    }

    let currentFront = 0;
    let currentRear = -1;

    for (let i = currentStep; i >= 0; i--) {
      const ev = timeline[i];
      if (ev?.variables && ('front' in ev.variables || 'head' in ev.variables)) {
        const f = ev.variables['front'] ?? ev.variables['head'];
        if (typeof f === 'number' && Math.abs(f) < 1000) {
          currentFront = f;
          break;
        }
      }
    }

    for (let i = currentStep; i >= 0; i--) {
      const ev = timeline[i];
      if (ev?.variables && ('rear' in ev.variables || 'tail' in ev.variables)) {
        const r = ev.variables['rear'] ?? ev.variables['tail'];
        if (typeof r === 'number' && Math.abs(r) < 1000) {
          currentRear = r;
          break;
        }
      }
    }

    let currentArray = new Array(capacity).fill(0);
    for (let i = currentStep; i >= 0; i--) {
      const ev = timeline[i];
      if (ev?.arrays?.[queueName] && Array.isArray(ev.arrays[queueName])) {
        currentArray = ev.arrays[queueName];
        break;
      }
    }

    return {
      name: queueName,
      array: currentArray,
      front: currentFront,
      rear: currentRear,
      capacity
    };
  }, [arrays, variables, timeline, currentStep]);

  // Detect Singly Linked List (structs with next/val or dynamic nodes)
  const linkedListNodes = useMemo(() => {
    function extractNodes(evStructs, evPointers) {
      if (!evStructs || Object.keys(evStructs).length === 0) return [];
      const nodes = [];
      for (const [sName, sFields] of Object.entries(evStructs)) {
        if (typeof sFields === 'object' && ('next' in sFields || 'data' in sFields || 'val' in sFields)) {
          nodes.push({
            name: sName,
            address: evPointers?.[sName]?.targetAddress || evPointers?.[sName]?.address || sName,
            data: sFields.data ?? sFields.val ?? sFields.value,
            next: sFields.next
          });
        }
      }
      return nodes;
    }

    // Try current event first
    let nodes = extractNodes(structs, pointers);
    if (nodes.length > 0) return nodes;

    // Scan timeline for step with richest linked list data
    for (let i = timeline.length - 1; i >= 0; i--) {
      const ev = timeline[i];
      nodes = extractNodes(ev.structs, ev.pointers);
      if (nodes.length > 0) return nodes;
    }
    return [];
  }, [structs, pointers, timeline]);

  // List of active detected topics for the adaptive composition ribbon
  const activeTopicsList = useMemo(() => {
    const list = [];
    if (hasGraph) list.push('Graph BFS/DFS');
    if (hasTree) list.push('Tree / BST');
    if (hasHashTable) list.push('Hash Table');
    if (hasDP) list.push('Dynamic Programming');
    if (hasBitwise) list.push('Bit Manipulation');
    if (hasRecursion) list.push('Recursion');
    if (hasPointerSwap) list.push('Pointer Swap');
    if (stackData) list.push('Stack (LIFO)');
    if (queueData) list.push('Queue (FIFO)');
    if (linkedListNodes.length > 0) list.push('Linked List');
    if (hasArrays && !stackData && !queueData && !hasDP && !hasHashTable) list.push('Array');
    if (hasLoops) list.push('Loop Radar');
    if (hasPointers) list.push('Pointers');
    if (hasHeap) list.push('Dynamic Heap');
    if (variables && Object.keys(variables).some(k => !['argc', 'argv', '__func__'].includes(k))) list.push('Stack Variables');
    return list;
  }, [hasGraph, hasTree, hasHashTable, hasDP, hasBitwise, hasRecursion, hasPointerSwap, stackData, queueData, linkedListNodes, hasArrays, hasLoops, hasPointers, hasHeap, variables]);

  const hasVariables = useMemo(() => {
    if (!variables) return false;
    return Object.keys(variables).some(k => !['argc', 'argv', '__func__'].includes(k));
  }, [variables]);

  const hasAnySpatialDiagram = hasArrays || hasLoops || hasPointers || hasStructs || hasHeap || hasStackOrCalls || stackData || queueData || linkedListNodes.length > 0 || hasTree || hasGraph || hasHashTable || hasDP || hasBitwise || hasRecursion || hasPointerSwap;

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

      {/* 0a. Recursion Tree & Unwinding (Shown for recursive programs — faithful cascading call tree) */}
      {hasRecursion && (
        <>
          <RecursionVisualizer
            timeline={timeline}
            currentStep={currentStep}
            animationDuration={animationDuration}
          />
          <RecursionTreeView
            timeline={timeline}
            currentStep={currentStep}
            animationDuration={animationDuration}
          />
        </>
      )}

      {/* 0b. Pointer Swap Visualizer (shown before bitwise for swap programs) */}
      {hasPointerSwap && (
        <PointerSwapVisualizer
          variables={variables}
          pointers={pointers}
          event={event}
          timeline={timeline}
          currentStep={currentStep}
          animationDuration={animationDuration}
        />
      )}

      {/* 1. Stack DSA Visualizer (Vertical LIFO Chamber matching reference) */}
      {stackData && (
        <StackVisualizer
          stackData={stackData}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* 2. Queue DSA Visualizer (Horizontal FIFO Conveyor matching reference) */}
      {queueData && (
        <QueueVisualizer
          queueData={queueData}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* 3. Linked List Visualizer (Chain of Nodes with Pointer Arrows matching WsCube) */}
      {linkedListNodes.length > 0 && (
        <LinkedListView
          nodes={linkedListNodes}
          pointers={pointers}
          variables={variables}
          event={event}
        />
      )}

      {/* 4. Graph Visualizer (When Graph algorithms or adjacency structures exist) */}
      {hasGraph && (
        <GraphVisualizer
          event={event}
          variables={variables}
          arrays={arrays}
          animationDuration={animationDuration}
        />
      )}

      {/* 5. Tree Visualizer (When Tree / BST structures exist) */}
      {hasTree && (
        <TreeVisualizer
          event={event}
          variables={variables}
          structs={structs}
          animationDuration={animationDuration}
        />
      )}

      {/* 6. Hash Table Visualizer (When Hashing / Bucket mapping exists) */}
      {hasHashTable && (
        <HashTableVisualizer
          event={event}
          variables={variables}
          arrays={arrays}
          animationDuration={animationDuration}
        />
      )}

      {/* 7. Dynamic Programming Visualizer (When dp / memo / recurrence exists) */}
      {hasDP && (
        <DPVisualizer
          event={event}
          variables={variables}
          arrays={arrays}
          animationDuration={animationDuration}
        />
      )}

      {/* 8. Bit Manipulation Visualizer (When bitwise &, |, ^, shifts exist — excluded for pointer swaps) */}
      {hasBitwise && !hasPointerSwap && (
        <BitVisualizer
          event={event}
          variables={variables}
          animationDuration={animationDuration}
        />
      )}

      {/* 9. Array Iteration View: Shows arrays. Excludes only the specific array being visualized in a specialized container (Stack/Queue/DP) so any input or data arrays remain fully visible! */}
      {hasArrays && (() => {
        const displayArrays = {};
        for (const [name, val] of Object.entries(arrays || {})) {
          if (stackData && name === stackData.name) continue;
          if (queueData && name === queueData.name) continue;
          if (hasDP && /^(dp|memo|fib|table)\b/i.test(name)) continue;
          displayArrays[name] = val;
        }
        if (Object.keys(displayArrays).length > 0) {
          return (
            <ArrayView
              arrays={displayArrays}
              highlight={highlight}
              changes={arrayChanges}
              variables={variables}
              animationDuration={animationDuration}
              pointerVars={pointerVars}
            />
          );
        }
        return null;
      })()}

      {/* Condition Evaluation (Shown for branching programs without specialized DSA containers) */}
      {!hasRecursion && !stackData && !queueData && !hasPointerSwap && (
        <ConditionView event={event} />
      )}

      {/* Loop Trail Recedes in 3D */}
      <LoopView event={event} />

      {/* Loop Storyteller — Shows for programs with loops when not already focused on Stack/Queue/Recursion */}
      {hasLoops && !stackData && !queueData && !hasRecursion && (
        <IterationSpaceView
          event={event}
          timeline={timeline}
          currentStep={currentStep}
          animationDuration={animationDuration}
        />
      )}

      {/* Persistent Loop & Condition Status Strip — Smooth single-line indicator */}
      <LoopConditionStrip event={event} />

      {/* Pointers & Memory Links (shown for pointer programs without specialized PointerSwap) */}
      {hasPointers && !hasPointerSwap && (
        <PointerView
          pointers={pointers}
          variables={variables}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* Struct Instances View (shown when not displayed as Linked List) */}
      {hasStructs && linkedListNodes.length === 0 && (
        <StructView
          structs={structs}
          event={event}
          animationDuration={animationDuration}
        />
      )}

      {/* Unified Call Stack View (GDB Function Call Stack — shown for function execution when call stack has frames) */}
      {hasStackOrCalls && !hasRecursion && (
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

      {/* 7. Stack Variables View — Rendered whenever variables exist so scalar calculations (max, min, sum, counters, flags) are always visible and animated */}
      {hasVariables && (
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
