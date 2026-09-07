/**
 * Why Engine — Deterministic Rule-Based Explanation Generator
 * 
 * Generates natural plain-English explanations for all C constructs:
 * scalars, arrays, pointers, structs, functions, recursion, and heap memory.
 * Includes strict validation passes to ensure captions never misclassify
 * arithmetic operations or loop condition re-evaluations as pointer dereferences.
 */

export function generateExplanation(event, prevVariables = {}, prevArrays = {}, prevStructs = {}, prevPointers = {}) {
  const { 
    eventType, 
    sourceLine = '', 
    variables = {}, 
    arrays = {}, 
    structs = {}, 
    pointers = {}, 
    changes = [], 
    arrayChanges = [], 
    structChanges = [], 
    pointerChanges = [],
    conditionResult, 
    function: funcName, 
    callDepth = 1,
    loopState 
  } = event;

  const trimmed = sourceLine.trim();

  let caption = '';

  switch (eventType) {
    case 'POINTER_CREATED':
    case 'POINTER_REASSIGNED': {
      if (pointerChanges && pointerChanges.length > 0) {
        const pc = pointerChanges[0];
        const ptrObj = pointers[pc.name];
        const targetDesc = ptrObj?.pointsToVar ? `variable ${ptrObj.pointsToVar}` : `address ${pc.to}`;
        caption = `Pointer ${pc.name} now points to ${targetDesc} (${pc.to}).`;
        break;
      }
      caption = `Executing pointer assignment: ${sourceLine}`;
      break;
    }

    case 'POINTER_DEREFERENCE': {
      // Find unary * followed by identifier
      const cleanLine = trimmed.replace(/\(\s*(?:const\s+)?(?:unsigned\s+)?(?:int|char|float|double|void|struct\s+\w+)\s*\*+\s*\)/g, '');
      const derefMatches = [...cleanLine.matchAll(/(?:^|[^a-zA-Z0-9_\)\]])\s*\*+\s*([a-zA-Z_]\w*)/g)];
      const validMatch = derefMatches.find(m => pointers && m[1] in pointers);

      if (validMatch) {
        const ptrName = validMatch[1];
        const ptrObj = pointers[ptrName];
        const val = (ptrObj && ptrObj.dereferencedValue !== null && ptrObj.dereferencedValue !== undefined)
          ? ptrObj.dereferencedValue
          : 'value';
        if (sourceLine.includes('=')) {
          caption = `*${ptrName} writes or modifies the value at the address ${ptrName} points to (${val}).`;
        } else {
          caption = `*${ptrName} reads the value stored at the address ${ptrName} points to (${val}).`;
        }
        break;
      }

      // VALIDATION PASS: If marked POINTER_DEREFERENCE without genuine pointer, fall back!
      if (/^(for|while)\s*\(/.test(trimmed)) {
        const condMatch = sourceLine.match(/for\s*\([^;]+;\s*([^;]+);/);
        const cond = condMatch ? condMatch[1].trim() : trimmed;
        caption = `Re-evaluating loop condition: ${cond}.`;
        break;
      }
      caption = `Executing statement: ${sourceLine}`;
      break;
    }

    case 'STRUCT_CREATED': {
      const sNames = Object.keys(structs).filter(k => !(k in prevStructs));
      if (sNames.length > 0) {
        const name = sNames[0];
        const fields = JSON.stringify(structs[name]).replace(/"/g, '').replace(/,/g, ', ');
        caption = `Instantiating struct ${name} with initial fields ${fields}.`;
        break;
      }
      caption = `Creating struct: ${sourceLine}`;
      break;
    }

    case 'STRUCT_FIELD_CHANGED': {
      if (structChanges && structChanges.length > 0) {
        const sc = structChanges[0];
        caption = `${sc.struct}.${sc.field} is updated from ${sc.from} to ${sc.to}.`;
        break;
      }
      caption = `Updating struct field: ${sourceLine}`;
      break;
    }

    case 'FUNCTION_CALLED': {
      const callMatch = sourceLine.match(/(\w+)\s*\(([^)]*)\)/);
      const calledFunc = callMatch ? callMatch[1] : funcName;
      const args = callMatch ? callMatch[2] : '';
      caption = `Calling function ${calledFunc}(${args}) — control jumps into the function body and a new frame is pushed onto the stack.`;
      break;
    }

    case 'RECURSIVE_CALL': {
      const callMatch = sourceLine.match(/(\w+)\s*\(([^)]*)\)/);
      const calledFunc = callMatch ? callMatch[1] : funcName;
      const args = callMatch ? callMatch[2] : '';
      caption = `Recursive call: ${calledFunc}(${args}) is pushed onto the call stack at depth ${callDepth} waiting for sub-problem result.`;
      break;
    }

    case 'FUNCTION_RETURNED': {
      caption = `Function ${funcName} returned. Control returns to the caller and its stack frame is popped.`;
      break;
    }

    case 'HEAP_ALLOCATED': {
      const allocMatch = sourceLine.match(/(\w+)\s*=\s*(?:\([^)]+\)\s*)?(?:malloc|calloc)\s*\(([^)]+)\)/);
      if (allocMatch) {
        const ptrName = allocMatch[1];
        const size = allocMatch[2];
        const ptrObj = pointers[ptrName];
        const addr = ptrObj?.targetAddress || 'heap';
        caption = `malloc reserves ${size} bytes on the heap at ${addr}, and ${ptrName} now points to it.`;
        break;
      }
      caption = `Dynamic memory allocated on heap: ${sourceLine}`;
      break;
    }

    case 'HEAP_FREED': {
      const freeMatch = sourceLine.match(/free\s*\(\s*(\w+)\s*\)/);
      if (freeMatch) {
        const ptrName = freeMatch[1];
        caption = `free(${ptrName}) releases the allocated memory block on the heap back to the operating system.`;
        break;
      }
      caption = `Releasing heap memory block: ${sourceLine}`;
      break;
    }

    case 'LOOP_STARTED': {
      const forMatch = sourceLine.match(/for\s*\(\s*(?:(?:int\s+)?(\w+)\s*=\s*([^;]+?))?\s*;\s*([^;]+?)\s*;\s*([^)]+?)\)/);
      if (forMatch && forMatch[1]) {
        const [, varName, initVal, cond] = forMatch;
        caption = `Starting for loop: ${varName} initialized to ${initVal ? initVal.trim() : 'start'}, runs while ${cond.trim()}.`;
        break;
      }
      const whileMatch = sourceLine.match(/while\s*\((.+)\)/);
      if (whileMatch) {
        caption = `Starting while loop: condition (${whileMatch[1].trim()}).`;
        break;
      }
      caption = `Entering loop: ${trimmed}`;
      break;
    }

    case 'LOOP_ITERATION': {
      // Check if this step is on a for-loop condition line (e.g., for(j = k; j <= i * n; j++))
      const forMatch = sourceLine.match(/for\s*\([^;]*;\s*([^;]+);/);
      if (forMatch) {
        const cond = forMatch[1].trim();
        const iter = (loopState?.currentLoop?.iteration ?? 0) + 1;
        const loopVar = loopState?.currentLoop?.variable;
        const varVal = (loopVar && variables[loopVar] !== undefined) ? ` (${loopVar} = ${variables[loopVar]})` : '';
        caption = `Re-evaluating loop condition: ${cond} — starting iteration ${iter}${varVal}.`;
        break;
      }
      const whileMatch = sourceLine.match(/while\s*\((.+)\)/);
      if (whileMatch) {
        const cond = whileMatch[1].trim();
        const iter = (loopState?.currentLoop?.iteration ?? 0) + 1;
        caption = `Re-evaluating while condition: ${cond} — iteration ${iter}.`;
        break;
      }
      if (loopState && loopState.currentLoop) {
        const loop = loopState.currentLoop;
        const iter = loop.iteration + 1;
        if (loop.variable && variables[loop.variable] !== undefined) {
          caption = `Loop iteration ${iter}: ${loop.variable} = ${variables[loop.variable]}.`;
          break;
        }
        caption = `Loop iteration ${iter}.`;
        break;
      }
      caption = `Advancing loop iteration: ${trimmed}`;
      break;
    }

    case 'CONDITION_CHECKED': {
      const condMatch = sourceLine.match(/(?:if|else\s+if)\s*\((.+)\)/);
      const cond = condMatch ? condMatch[1] : sourceLine;
      const res = conditionResult === true ? 'TRUE (entering if-body)' : 'FALSE (skipping if-body)';
      caption = `Evaluating condition: ${cond} → Result is ${res}.`;
      break;
    }

    case 'ARRAY_CHANGED': {
      if (arrayChanges && arrayChanges.length > 0) {
        const ac = arrayChanges[0];
        if (ac.row !== undefined) {
          caption = `2D Array update: ${ac.array}[${ac.row}][${ac.col}] changed from ${ac.from} to ${ac.to}.`;
          break;
        }
        caption = `Array element ${ac.array}[${ac.index}] changed from ${ac.from} to ${ac.to}.`;
        break;
      }
      caption = `Modifying array element: ${sourceLine}`;
      break;
    }

    case 'ARRAY_ACCESS': {
      caption = `Reading array element: ${sourceLine}`;
      break;
    }

    case 'VARIABLE_CREATED': {
      const varEntries = Object.entries(variables).filter(([k]) => !(k in prevVariables));
      if (varEntries.length > 0) {
        const [k, v] = varEntries[0];
        caption = `Initializing variable ${k} with value ${v}.`;
        break;
      }
      caption = `Declaring variable: ${sourceLine}`;
      break;
    }

    case 'VARIABLE_CHANGED': {
      if (changes && changes.length > 0) {
        const c = changes[0];
        caption = `Variable ${c.name} updated from ${c.from} to ${c.to}.`;
        break;
      }
      caption = `Updating variable: ${sourceLine}`;
      break;
    }

    case 'PROGRAM_END': {
      caption = `Program execution reached return 0 and successfully terminated.`;
      break;
    }

    case 'RUNTIME_ERROR': {
      caption = `Runtime exception occurred during execution: ${event.runtimeError || 'Illegal Operation'}.`;
      break;
    }

    default:
      caption = `Executing: ${sourceLine}`;
      break;
  }

  // Final Validation Pass: Guarantee consistency between caption and trace pointer variables
  if (caption.includes('Dereferencing pointer') || 
      caption.includes('reads the value stored at the address') || 
      caption.includes('writes or modifies the value at the address')) {
    const hasActualPointer = Object.keys(pointers || {}).some(pName => {
      const rx = new RegExp(`(?:^|[^a-zA-Z0-9_\\]\\)])\\s*\\*+\\s*\\b${pName}\\b`);
      return rx.test(sourceLine);
    });
    if (!hasActualPointer) {
      if (/^(for|while)\s*\(/.test(trimmed)) {
        const condMatch = sourceLine.match(/for\s*\([^;]+;\s*([^;]+);/);
        const cond = condMatch ? condMatch[1].trim() : trimmed;
        return `Re-evaluating loop condition: ${cond}`;
      }
      return `Executing statement: ${trimmed}`;
    }
  }

  return caption;
}
