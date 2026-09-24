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

function isGarbageValue(val) {
  if (typeof val !== 'number') return false;
  if (val === 32767 || val === -32768) return true;
  if (val === -134542720 || val === 4194432) return true;
  if (val === 2147483647 || val === -2147483648) return true;
  // Very large absolute values are almost certainly uninitialized stack memory
  // (safe: real educational programs rarely produce ±1M for unassigned vars;
  //  assigned vars pass through regardless via the isVariableAssigned check)
  if (Math.abs(val) > 1000000) return true;
  return false;
}

function findDeclarations(sourceLines) {
  const decls = {};
  if (!Array.isArray(sourceLines)) return decls;
  // Match lines that start with a C type keyword
  const typePrefix = /^\s*(?:const\s+)?(?:unsigned\s+)?(?:signed\s+)?(?:int|char|float|double|long|short|size_t|struct\s+\w+)\s+/;
  for (let l = 0; l < sourceLines.length; l++) {
    const line = sourceLines[l];
    if (line.trim().startsWith('#')) continue;
    if (/struct\s+\w+\s*\{/.test(line)) continue;

    // Check for for-loop declarations: for (int i = 0; ...)
    const forDeclMatch = line.match(/for\s*\(\s*(?:int|char|float|double|long|short|unsigned)\s+(\w+)\s*=/);
    if (forDeclMatch && forDeclMatch[1]) {
      const varName = forDeclMatch[1];
      if (!decls[varName]) {
        decls[varName] = { line: l + 1, hasInit: true, isChar: false };
      }
      continue;
    }

    // Standard declarations: type varName ...
    if (!typePrefix.test(line)) continue;
    // Skip function definitions like: int main() { or void swap(int *a, ...) {
    if (/\w+\s*\([^)]*\)\s*\{?\s*$/.test(line.trim()) && !line.includes('=')) continue;

    // Strip the type prefix to get the variable declarations part
    const afterType = line.replace(typePrefix, '');

    // Split by top-level commas (respecting braces for array initializers like {1,2,3})
    const parts = [];
    let current = '';
    let depth = 0;
    for (let ci = 0; ci < afterType.length; ci++) {
      const ch = afterType[ci];
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      // Match: optional *, variable name, optional [size], before = or ; or end
      const m = part.match(/^\*?\s*([a-zA-Z_]\w*)\s*(?:\[.*?\])?\s*(?:=|;|$)/);
      if (m && m[1] && !['main', 'return', 'if', 'for', 'while', 'const', 'void'].includes(m[1])) {
        const varName = m[1];
        if (!decls[varName]) {
          const hasInit = part.includes('=');
          decls[varName] = {
            line: l + 1,
            hasInit,
            isChar: /char\b/.test(line)
          };
        }
      }
    }
  }
  return decls;
}

function isVariableAssigned(varName, currentLine, sourceLines, declInfo) {
  if (!sourceLines || !Array.isArray(sourceLines)) return false;
  if (declInfo?.hasInit && currentLine >= declInfo.line) return true;
  const assignRegex = new RegExp(`(?:\\b${varName}\\s*(?:=|\\+=|-=|\\*=|/=|%=|\\+\\+|--)|(?:\\+\\+|--)\\s*${varName}\\b|scanf\\s*\\([^)]*&?\\s*${varName}\\b|for\\s*\\(\\s*(?:int\\s+)?${varName}\\s*=)`);
  const maxLine = Math.min(currentLine, sourceLines.length);
  for (let l = 0; l < maxLine; l++) {
    const sLine = sourceLines[l];
    if (assignRegex.test(sLine)) {
      return true;
    }
  }
  return false;
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
    if (!argStr) return '';
    const trimmed = argStr.trim();

    // String literal e.g. "prime"
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // 1. Direct variable lookup
    if (variables[trimmed] !== undefined) {
      return variables[trimmed];
    }

    // 2. 1D Array lookup e.g. arr[i] or arr[0]
    const arr1d = trimmed.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]$/);
    if (arr1d) {
      const arrName = arr1d[1];
      const idxExpr = arr1d[2].trim();
      const idx = variables[idxExpr] !== undefined ? variables[idxExpr] : parseInt(idxExpr, 10);
      if (arrays[arrName] && Array.isArray(arrays[arrName]) && !isNaN(idx)) {
        return arrays[arrName][idx];
      }
    }

    // 3. 2D Array lookup e.g. m[i][j]
    const arr2d = trimmed.match(/^([a-zA-Z_]\w*)\[([^\]]+)\]\[([^\]]+)\]$/);
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

    // 4. Expression evaluation e.g. a + b, n % 2 == 0 ? "even" : "odd"
    try {
      let expr = trimmed;
      // Replace variables with their values
      for (const [v, val] of Object.entries(variables)) {
        if (typeof val === 'number') {
          expr = expr.replace(new RegExp(`\\b${v}\\b`, 'g'), String(val));
        } else if (typeof val === 'string') {
          expr = expr.replace(new RegExp(`\\b${v}\\b`, 'g'), JSON.stringify(val));
        }
      }
      return Function('"use strict"; return (' + expr + ')')();
    } catch {}

    return trimmed;
  }

  let argIndex = 0;
  // Match full C format specifiers e.g. %d, %i, %.2f, %lf, %lld, %c, %s, %p, %x, %u
  const replaced = formatStr.replace(/%(?:\d+\$)?[-+ 0#]*\d*(?:\.(\d+))?[hljztL]*([diuoxXfFeEgGaAcsp%])/g, (match, precision, specifier) => {
    if (specifier === '%') return '%';
    if (argIndex < args.length) {
      const rawVal = evalArg(args[argIndex++]);
      if (rawVal === undefined || rawVal === null) return match;

      if (specifier === 'c') {
        if (typeof rawVal === 'number') return String.fromCharCode(rawVal);
        return String(rawVal)[0] || '';
      }
      if (['f', 'F', 'e', 'E', 'g', 'G'].includes(specifier)) {
        const num = parseFloat(rawVal);
        if (!isNaN(num)) {
          return precision !== undefined ? num.toFixed(parseInt(precision, 10)) : String(num);
        }
      }
      if (['d', 'i', 'u', 'ld', 'lld'].includes(specifier)) {
        const num = parseInt(rawVal, 10);
        return !isNaN(num) ? String(num) : String(rawVal);
      }
      if (['x', 'X'].includes(specifier)) {
        const num = parseInt(rawVal, 10);
        return !isNaN(num) ? num.toString(16) : String(rawVal);
      }
      return String(rawVal);
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
    const { line, sourceLine, callStack, callDepth, function: funcName } = raw;

    // ─── POST-EXECUTION STATE SHIFT ──────────────────────────────────
    // GDB captures variable state BEFORE the current line executes.
    // To display values AFTER execution (matching PythonTutor / C Tutor),
    // use the NEXT step's captured values when still in the same context.
    // Smart per-variable fallback: if the shift introduces garbage (e.g. a
    // new same-named loop variable enters scope), keep the pre-shift value.
    const nextRaw = (i + 1 < rawSteps.length) ? rawSteps[i + 1] : null;
    const sameCtx = nextRaw &&
      nextRaw.function === funcName &&
      nextRaw.callDepth === callDepth &&
      !nextRaw.isRuntimeError;

    const variables = {};
    if (sameCtx) {
      const nv = nextRaw.variables || {};
      const cv = raw.variables || {};
      for (const k of new Set([...Object.keys(nv), ...Object.keys(cv)])) {
        if (k in nv) {
          // If shifted value is garbage but pre-shift value is clean, keep pre-shift
          if (isGarbageValue(nv[k]) && k in cv && !isGarbageValue(cv[k])) {
            variables[k] = cv[k];
          } else {
            variables[k] = nv[k];
          }
        } else {
          variables[k] = cv[k];
        }
      }
    } else {
      Object.assign(variables, raw.variables || {});
    }
    const arrays = sameCtx ? (nextRaw.arrays || {}) : (raw.arrays || {});
    const structs = sameCtx ? (nextRaw.structs || {}) : (raw.structs || {});
    const pointers = sameCtx ? (nextRaw.pointers || {}) : (raw.pointers || {});

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
    // With post-execution state shift, values are valid ON the declaration line
    const activeVariables = {};
    for (const [k, v] of Object.entries(variables || {})) {
      const declInfo = typeof decls[k] === 'object' ? decls[k] : { line: decls[k], hasInit: false };
      const declLine = declInfo?.line;
      // For non-main functions, trust GDB's frame-scoped locals/args directly
      if (funcName !== 'main' || !declLine || line >= declLine) {
        const assigned = isVariableAssigned(k, line, sourceLines, declInfo);
        // Suppress uninitialized stack garbage
        if (isGarbageValue(v) && !assigned) {
          continue;
        }
        activeVariables[k] = v;
      }
    }

    const activeArrays = {};
    for (const [k, v] of Object.entries(arrays || {})) {
      const declInfo = typeof decls[k] === 'object' ? decls[k] : { line: decls[k], hasInit: false };
      const declLine = declInfo?.line;
      if (funcName !== 'main' || !declLine || line >= declLine) {
        activeArrays[k] = v;
      }
    }

    const activeStructs = {};
    for (const [k, v] of Object.entries(structs || {})) {
      const declInfo = typeof decls[k] === 'object' ? decls[k] : { line: decls[k], hasInit: false };
      const declLine = declInfo?.line;
      if (funcName !== 'main' || !declLine || line >= declLine) {
        activeStructs[k] = v;
      }
    }

    const activePointers = {};
    for (const [k, v] of Object.entries(pointers || {})) {
      const declInfo = typeof decls[k] === 'object' ? decls[k] : { line: decls[k], hasInit: false };
      const declLine = declInfo?.line;
      if (funcName !== 'main' || !declLine || line >= declLine) {
        activePointers[k] = v;
      }
    }

    // If a genuine string/char array variable is in activeVariables, ensure its character array is in activeArrays
    // (Do not convert pointer addresses like "0x61ff1c" or NULL into character arrays)
    for (const [k, v] of Object.entries(activeVariables)) {
      if (
        typeof v === 'string' &&
        v.length > 0 &&
        !activeArrays[k] &&
        !activePointers[k] &&
        !pointers?.[k] &&
        !v.startsWith('0x') &&
        v !== 'NULL' &&
        (decls[k]?.isChar || (!v.startsWith('0x') && !/^[0-9a-fA-Fx]+$/.test(v)))
      ) {
        activeArrays[k] = v.split('');
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
    } else if (/\w+\[[^\]]+\]\s*=[^=]/.test(sourceLine)) {
      // Source-line pattern: assignment to array element (arr[i] = ...)
      eventType = EventType.ARRAY_CHANGED;
    } else if (/\w+\[[^\]]+\]/.test(sourceLine)) {
      eventType = EventType.ARRAY_ACCESS;
    }
    // 8. Variable Created / Changed
    else if (newVars.length > 0) {
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
