/**
 * Timeline Builder
 * 
 * Transforms raw GDB execution steps into structured timeline events
 * matching the complete VisualCode event schema.
 */

import { generateExplanation } from './whyEngine.js';

export const EventType = {
  VARIABLE_CREATED: 'VARIABLE_CREATED',
  VARIABLE_CHANGED: 'VARIABLE_CHANGED',
  ARRAY_ACCESS: 'ARRAY_ACCESS',
  ARRAY_CHANGED: 'ARRAY_CHANGED',
  POINTER_CREATED: 'POINTER_CREATED',
  POINTER_REASSIGNED: 'POINTER_REASSIGNED',
  POINTER_DEREFERENCE: 'POINTER_DEREFERENCE',
  STRUCT_CREATED: 'STRUCT_CREATED',
  STRUCT_FIELD_CHANGED: 'STRUCT_FIELD_CHANGED',
  FUNCTION_CALLED: 'FUNCTION_CALLED',
  FUNCTION_RETURNED: 'FUNCTION_RETURNED',
  RECURSIVE_CALL: 'RECURSIVE_CALL',
  LOOP_STARTED: 'LOOP_STARTED',
  LOOP_ITERATION: 'LOOP_ITERATION',
  LOOP_ENDED: 'LOOP_ENDED',
  CONDITION_CHECKED: 'CONDITION_CHECKED',
  HEAP_ALLOCATED: 'HEAP_ALLOCATED',
  HEAP_FREED: 'HEAP_FREED',
  PROGRAM_END: 'PROGRAM_END',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  STATEMENT: 'STATEMENT'
};

function findDeclarations(sourceLines) {
  const decls = {};
  if (!Array.isArray(sourceLines)) return decls;
  const typeRegex = /^\s*(?:const\s+)?(?:int|char|float|double|long|short|unsigned|signed|size_t|struct\s+\w+)\b/;
  for (let l = 0; l < sourceLines.length; l++) {
    const line = sourceLines[l];
    if (line.trim().startsWith('#') || !typeRegex.test(line)) continue;
    if (/struct\s+\w+\s*\{/.test(line)) continue;
    if (/\w+\s*\([^)]*\)\s*\{?$/.test(line.trim()) && !line.includes('=')) continue;

    const beforeAssign = line.split('=')[0];
    const afterType = beforeAssign.replace(typeRegex, '');
    const parts = afterType.split(',');
    for (const part of parts) {
      const m = part.match(/\*?\s*([a-zA-Z_]\w*)\s*(?:\[.*\])?/);
      if (m && m[1] && !['main', 'return', 'if', 'for', 'while', 'const'].includes(m[1])) {
        if (!decls[m[1]]) decls[m[1]] = l + 1;
      }
    }
  }
  return decls;
}

function isTruePointerDereference(sourceLine, activePointers, allKnownPointers) {
  if (!sourceLine || !sourceLine.includes('*')) return false;
  const trimmed = sourceLine.trim();

  // 1. Loops, conditions, and control statements are NEVER pointer dereferences
  if (/^(for|while|if|else\s+if|do|switch|case)\b/.test(trimmed)) return false;

  // 2. Variable or pointer declaration lines (e.g., int *p = ..., char *s;) are declarations/creations, not dereferences
  if (/^\s*(?:const\s+)?(?:unsigned\s+)?(?:signed\s+)?(?:int|char|float|double|void|long|short|struct\s+\w+)\s*\*+/.test(trimmed)) {
    return false;
  }

  // 3. Ignore pointer cast expressions like (int *), (void *)
  const cleanLine = trimmed.replace(/\(\s*(?:const\s+)?(?:unsigned\s+)?(?:signed\s+)?(?:int|char|float|double|void|long|short|struct\s+\w+)\s*\*+\s*\)/g, '');

  // 4. Look for unary * applied to a pointer variable:
  // In binary multiplication (e.g. i * n, (a + b) * c, arr[0] * 2), '*' is preceded by an operand: [a-zA-Z0-9_\)\]]
  // In unary dereference (e.g. *a = *b, val = *ptr), '*' is preceded by line start, an operator, open paren/bracket, comma, etc.
  const unaryMatches = cleanLine.matchAll(/(?:^|[^a-zA-Z0-9_\)\]])\s*\*+\s*([a-zA-Z_]\w*)/g);
  for (const match of unaryMatches) {
    const candidateVar = match[1];
    // Check against GDB-reported pointers!
    if ((activePointers && candidateVar in activePointers) || 
        (allKnownPointers && allKnownPointers.has(candidateVar))) {
      return true;
    }
  }

  return false;
}

/**
 * Accurately evaluate printf / puts statements given current variables & arrays
 */
export function evaluatePrintf(sourceLine, variables = {}, arrays = {}) {
  if (!sourceLine) return null;
  const trimmed = sourceLine.trim();

  // Handle puts("...")
  const putsMatch = trimmed.match(/^puts\s*\(\s*"([^"]*)"\s*\)/);
  if (putsMatch) {
    return putsMatch[1] + '\n';
  }

  // Handle printf("...")
  const printfMatch = trimmed.match(/printf\s*\(\s*"([^"]*)"(?:\s*,\s*([\s\S]+))?\s*\)\s*;/);
  if (!printfMatch) return null;

  let formatStr = printfMatch[1];
  const argsRaw = printfMatch[2];

  if (!argsRaw) {
    return formatStr.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }

  // Split args by comma respecting brackets/parens
  const args = [];
  let currentArg = '';
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < argsRaw.length; i++) {
    const char = argsRaw[i];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth--;

    if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
      args.push(currentArg.trim());
      currentArg = '';
    } else {
      currentArg += char;
    }
  }
  if (currentArg.trim()) {
    args.push(currentArg.trim());
  }

  function evalArg(argStr) {
    // 1. Direct variable lookup
    if (variables[argStr] !== undefined) {
      return variables[argStr];
    }

    // 2. 1D Array lookup e.g. arr[i] or arr[0]
    const arr1d = argStr.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]$/);
    if (arr1d) {
      const arrName = arr1d[1];
      const idxExpr = arr1d[2].trim();
      const idx = variables[idxExpr] !== undefined ? variables[idxExpr] : parseInt(idxExpr, 10);
      if (arrays[arrName] && Array.isArray(arrays[arrName]) && !isNaN(idx)) {
        return arrays[arrName][idx];
      }
    }

    // 3. 2D Array lookup e.g. m[i][j]
    const arr2d = argStr.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]\[([^\]]+)\]$/);
    if (arr2d) {
      const arrName = arr2d[1];
      const rExpr = arr2d[2].trim();
      const cExpr = arr2d[3].trim();
      const r = variables[rExpr] !== undefined ? variables[rExpr] : parseInt(rExpr, 10);
      const c = variables[cExpr] !== undefined ? variables[cExpr] : parseInt(cExpr, 10);
      if (arrays[arrName] && Array.isArray(arrays[arrName]) && !isNaN(r) && !isNaN(c)) {
        return arrays[arrName][r]?.[c];
      }
    }

    // 4. Expression evaluation e.g. i * 10 or n + 1
    try {
      let expr = argStr;
      for (const [v, val] of Object.entries(variables)) {
        if (typeof val === 'number') {
          expr = expr.replace(new RegExp(`\\b${v}\\b`, 'g'), String(val));
        }
      }
      const sanitized = expr.replace(/[^0-9+\-*/%(). ]/g, '');
      if (sanitized.length > 0 && sanitized.length < 40) {
        return Function('"use strict"; return (' + sanitized + ')')();
      }
    } catch {}

    return argStr;
  }

  let argIndex = 0;
  const replaced = formatStr.replace(/%[difsugx]/g, (match) => {
    if (argIndex < args.length) {
      const val = evalArg(args[argIndex++]);
      return val !== undefined ? val : match;
    }
    return match;
  });

  return replaced.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

/**
 * Build structured timeline events from raw GDB steps
 */
export function buildTimeline(rawSteps, sourceLines, heapState) {
  if (!rawSteps || rawSteps.length === 0) return [];

  const timeline = [];
  let prevStep = null;
  let loopStack = [];
  let seenLoopLines = new Set();
  let stepCounter = 0;
  let cumulativeStdout = '';
  const decls = findDeclarations(sourceLines);

  const allKnownPointers = new Set();
  for (const step of rawSteps) {
    if (step.pointers) {
      for (const pName of Object.keys(step.pointers)) {
        allKnownPointers.add(pName);
      }
    }
  }

  for (let i = 0; i < rawSteps.length; i++) {
    const raw = rawSteps[i];
    const { line, sourceLine, variables, arrays, structs, pointers, callStack, callDepth, function: funcName } = raw;

    // Check for runtime error step
    if (raw.isRuntimeError) {
      const errEvent = {
        step: stepCounter++,
        line,
        function: funcName || 'main',
        callDepth: callDepth || 1,
        callStack: callStack || [],
        sourceLine: sourceLine || '',
        eventType: EventType.RUNTIME_ERROR,
        runtimeError: raw.runtimeError || 'Segmentation Fault / Runtime Crash',
        variables: { ...variables },
        arrays: { ...arrays },
        structs: { ...structs },
        pointers: { ...pointers },
        heapAllocations: raw.heapAllocations || [],
        highlight: {},
        why: `CRASH: ${raw.runtimeError}. Likely accessing invalid memory or exceeding recursion limit.`
      };
      timeline.push(errEvent);
      break;
    }

    // Skip blank or comment lines
    if (!sourceLine || sourceLine.startsWith('//') || sourceLine === '{' || sourceLine === '}') {
      continue;
    }

    // Filter out uninitialized locals before their declaration line
    const isLoopHeader = /^(for|while)\s*\(/.test(sourceLine);
    const activeVariables = {};
    for (const [k, v] of Object.entries(variables || {})) {
      const declLine = decls[k];
      if (!declLine || (isLoopHeader ? line >= declLine : line > declLine)) {
        activeVariables[k] = v;
      }
    }

    const activeArrays = {};
    for (const [k, v] of Object.entries(arrays || {})) {
      const declLine = decls[k];
      if (!declLine || (isLoopHeader ? line >= declLine : line > declLine)) {
        activeArrays[k] = v;
      }
    }

    const activeStructs = {};
    for (const [k, v] of Object.entries(structs || {})) {
      const declLine = decls[k];
      if (!declLine || (isLoopHeader ? line >= declLine : line > declLine)) {
        activeStructs[k] = v;
      }
    }

    const activePointers = {};
    for (const [k, v] of Object.entries(pointers || {})) {
      const declLine = decls[k];
      if (!declLine || (isLoopHeader ? line >= declLine : line > declLine)) {
        activePointers[k] = v;
      }
    }

    const prevVars = prevStep?.variables || {};
    const prevArr = prevStep?.arrays || {};
    const prevStructs = prevStep?.structs || {};
    const prevPointers = prevStep?.pointers || {};
    const prevDepth = prevStep?.callDepth || 1;
    const prevFunc = prevStep?.function || 'main';

    // Diffs
    const changedVars = diffVariables(prevVars, activeVariables);
    const newVars = findNewKeys(prevVars, activeVariables);

    const changedArrays = diffArrays(prevArr, activeArrays);
    const newArrays = findNewKeys(prevArr, activeArrays);

    const changedStructs = diffStructs(prevStructs, activeStructs);
    const newStructs = findNewKeys(prevStructs, activeStructs);

    const changedPointers = diffPointers(prevPointers, activePointers);
    const newPointers = findNewKeys(prevPointers, activePointers);

    // Classive Event
    let eventType = EventType.STATEMENT;

    // 1. Function Call / Return / Recursion
    if (callDepth > prevDepth) {
      if (funcName === prevFunc) {
        eventType = EventType.RECURSIVE_CALL;
      } else {
        eventType = EventType.FUNCTION_CALLED;
      }
    } else if (callDepth < prevDepth) {
      eventType = EventType.FUNCTION_RETURNED;
    }
    // 2. Heap allocation / Free
    else if (/malloc|calloc/.test(sourceLine)) {
      eventType = EventType.HEAP_ALLOCATED;
    } else if (/free\s*\(/.test(sourceLine)) {
      eventType = EventType.HEAP_FREED;
    }
    // 3. Loops (Prioritized before pointer checks so for/while lines with expressions like j <= i * n are never misclassified as pointer dereferences)
    else if (/^(for|while)\s*\(/.test(sourceLine.trim()) || /^do\s*\{/.test(sourceLine.trim())) {
      if (seenLoopLines.has(line)) {
        eventType = EventType.LOOP_ITERATION;
      } else {
        seenLoopLines.add(line);
        eventType = EventType.LOOP_STARTED;
      }
    }
    // 4. Conditions
    else if (/^(if|else\s+if)\s*\(/.test(sourceLine.trim())) {
      eventType = EventType.CONDITION_CHECKED;
    }
    // 5. Pointer dereference & pointer changes (Verified against GDB pointer type information)
    else if (isTruePointerDereference(sourceLine, activePointers, allKnownPointers)) {
      eventType = EventType.POINTER_DEREFERENCE;
    } else if (changedPointers.length > 0) {
      eventType = EventType.POINTER_REASSIGNED;
    } else if (newPointers.length > 0) {
      eventType = EventType.POINTER_CREATED;
    }
    // 6. Struct changes
    else if (changedStructs.length > 0) {
      eventType = EventType.STRUCT_FIELD_CHANGED;
    } else if (newStructs.length > 0) {
      eventType = EventType.STRUCT_CREATED;
    }
    // 7. Arrays
    else if (changedArrays.length > 0) {
      eventType = EventType.ARRAY_CHANGED;
    } else if (/\w+\[[^\]]+\]/.test(sourceLine)) {
      eventType = EventType.ARRAY_ACCESS;
    }
    // 8. Variable Created / Changed
    else if (newVars.length > 0 && /^(int|float|double|char)\s+/.test(sourceLine.trim())) {
      eventType = EventType.VARIABLE_CREATED;
    } else if (changedVars.length > 0) {
      eventType = EventType.VARIABLE_CHANGED;
    }

    // Condition Evaluation
    let conditionResult = null;
    if (eventType === EventType.CONDITION_CHECKED) {
      const nextStep = (i + 1 < rawSteps.length) ? rawSteps[i + 1] : null;
      conditionResult = evaluateConditionBranch(sourceLine, activeVariables, activeArrays, nextStep, line);
    }

    // Update loop tracking
    updateLoopStack(eventType, sourceLine, loopStack, line);

    // Array highlight calculation
    const highlight = buildArrayHighlight(sourceLine, activeVariables, activeArrays);

    // Evaluate printf / puts output for this step
    const stepOutput = evaluatePrintf(sourceLine, activeVariables, activeArrays);
    if (stepOutput) {
      cumulativeStdout += stepOutput;
    }

    const event = {
      step: stepCounter++,
      line,
      function: funcName,
      callDepth,
      callStack: callStack.map(f => ({ ...f })),
      sourceLine,
      eventType,
      variables: { ...activeVariables },
      arrays: { ...activeArrays },
      structs: { ...activeStructs },
      pointers: { ...activePointers },
      heapAllocations: raw.heapAllocations || [],
      highlight,
      ...(stepOutput && { stepOutput }),
      stdout: cumulativeStdout,
      ...(conditionResult !== null && { conditionResult }),
      ...(changedVars.length > 0 && { changes: changedVars }),
      ...(newVars.length > 0 && { newVariables: newVars }),
      ...(changedArrays.length > 0 && { arrayChanges: changedArrays }),
      ...(changedStructs.length > 0 && { structChanges: changedStructs }),
      ...(changedPointers.length > 0 && { pointerChanges: changedPointers }),
      ...(loopStack.length > 0 && {
        loopState: {
          depth: loopStack.length,
          currentLoop: { ...loopStack[loopStack.length - 1] },
          stack: loopStack.map(l => ({ ...l }))
        }
      })
    };

    // Generate Why Explanation
    event.why = generateExplanation(event, prevVars, prevArr, prevStructs, prevPointers);

    timeline.push(event);
    prevStep = {
      ...raw,
      variables: activeVariables,
      arrays: activeArrays,
      structs: activeStructs,
      pointers: activePointers
    };
  }

  // Add final PROGRAM_END event if not present
  if (timeline.length > 0 && timeline[timeline.length - 1].eventType !== EventType.PROGRAM_END && timeline[timeline.length - 1].eventType !== EventType.RUNTIME_ERROR) {
    const last = timeline[timeline.length - 1];
    
    // Check for memory leaks
    const unFreedBlocks = (last.heapAllocations || []).filter(a => !a.freed);

    timeline.push({
      step: stepCounter++,
      line: last.line,
      function: 'main',
      callDepth: 1,
      callStack: [{ level: 0, func: 'main', line: last.line }],
      sourceLine: 'return 0;',
      eventType: EventType.PROGRAM_END,
      variables: { ...last.variables },
      arrays: { ...last.arrays },
      structs: { ...last.structs },
      pointers: { ...last.pointers },
      heapAllocations: last.heapAllocations || [],
      memoryLeaks: unFreedBlocks,
      highlight: {},
      stdout: cumulativeStdout,
      why: unFreedBlocks.length > 0 
        ? `Program ended with ${unFreedBlocks.length} unfreed heap memory block(s) (Memory Leak Warning!).`
        : `Program successfully finished execution with return 0.`
    });
  }

  return timeline;
}

function diffVariables(prev, cur) {
  const diffs = [];
  for (const [k, v] of Object.entries(cur)) {
    if (k in prev && prev[k] !== v && typeof v !== 'object') {
      diffs.push({ name: k, from: prev[k], to: v });
    }
  }
  return diffs;
}

function findNewKeys(prev, cur) {
  return Object.keys(cur).filter(k => !(k in prev));
}

function diffArrays(prev, cur) {
  const diffs = [];
  for (const [name, arr] of Object.entries(cur)) {
    if (name in prev) {
      const pArr = prev[name];
      if (Array.isArray(arr)) {
        for (let i = 0; i < arr.length; i++) {
          if (Array.isArray(arr[i])) {
            // 2D array
            for (let j = 0; j < arr[i].length; j++) {
              if (pArr[i] && pArr[i][j] !== arr[i][j]) {
                diffs.push({ array: name, row: i, col: j, from: pArr[i][j], to: arr[i][j] });
              }
            }
          } else if (pArr[i] !== arr[i]) {
            diffs.push({ array: name, index: i, from: pArr[i], to: arr[i] });
          }
        }
      }
    }
  }
  return diffs;
}

function diffStructs(prev, cur) {
  const diffs = [];
  for (const [name, fields] of Object.entries(cur)) {
    if (name in prev && typeof fields === 'object') {
      const pFields = prev[name];
      for (const [fName, fVal] of Object.entries(fields)) {
        if (pFields && pFields[fName] !== fVal) {
          diffs.push({ struct: name, field: fName, from: pFields[fName], to: fVal });
        }
      }
    }
  }
  return diffs;
}

function diffPointers(prev, cur) {
  const diffs = [];
  for (const [name, p] of Object.entries(cur)) {
    if (name in prev) {
      const prevP = prev[name];
      if (prevP.targetAddress !== p.targetAddress) {
        diffs.push({ name, from: prevP.targetAddress, to: p.targetAddress, pointsToVar: p.pointsToVar });
      }
    }
  }
  return diffs;
}

function buildArrayHighlight(sourceLine, variables, arrays) {
  const highlight = {};
  if (!sourceLine) return highlight;

  const accessPattern = /(\w+)\[([^\]]+)\]/g;
  let match;
  while ((match = accessPattern.exec(sourceLine)) !== null) {
    const arrName = match[1];
    const indexExpr = match[2].trim();

    if (arrName in arrays) {
      const idx = evaluateIndex(indexExpr, variables);
      if (idx !== null) {
        if (!highlight.array) {
          highlight.array = arrName;
          highlight.indices = [];
        }
        if (highlight.array === arrName && !highlight.indices.includes(idx)) {
          highlight.indices.push(idx);
        }
      }
    }
  }

  return highlight;
}

function evaluateIndex(expr, vars) {
  if (/^\d+$/.test(expr)) return parseInt(expr, 10);
  if (expr in vars && typeof vars[expr] === 'number') return vars[expr];
  const mAdd = expr.match(/^(\w+)\s*\+\s*(\d+)$/);
  if (mAdd && mAdd[1] in vars) return vars[mAdd[1]] + parseInt(mAdd[2], 10);
  const mSub = expr.match(/^(\w+)\s*-\s*(\d+)$/);
  if (mSub && mSub[1] in vars) return vars[mSub[1]] - parseInt(mSub[2], 10);
  return null;
}

function evaluateConditionBranch(sourceLine, variables, arrays, nextStep, currentLine) {
  if (nextStep) {
    if (nextStep.line === currentLine + 1) return true;
    if (nextStep.line > currentLine + 1) return false;
  }
  return null;
}

function updateLoopStack(eventType, sourceLine, loopStack, line) {
  if (eventType === EventType.LOOP_STARTED) {
    let loopVar = null;
    const forMatch = sourceLine.match(/for\s*\(\s*(?:int\s+)?(\w+)/);
    if (forMatch) loopVar = forMatch[1];
    else {
      const whileMatch = sourceLine.match(/while\s*\(\s*(\w+)/);
      if (whileMatch) loopVar = whileMatch[1];
    }

    // If an existing inner loop was recorded at or after this line, pop it
    while (loopStack.length > 0 && loopStack[loopStack.length - 1].line >= line) {
      loopStack.pop();
    }

    loopStack.push({
      line,
      type: sourceLine.trim().startsWith('while') ? 'while' : 'for',
      variable: loopVar,
      iteration: 0,
      condition: sourceLine.match(/\((.+)\)/)?.[1] || ''
    });
  } else if (eventType === EventType.LOOP_ITERATION && loopStack.length > 0) {
    // If we stepped back to an outer loop line, pop any inner loops
    while (loopStack.length > 0 && loopStack[loopStack.length - 1].line > line) {
      loopStack.pop();
    }
    if (loopStack.length > 0) {
      loopStack[loopStack.length - 1].iteration++;
    }
  } else if (eventType === EventType.LOOP_ENDED && loopStack.length > 0) {
    loopStack.pop();
  }
}
