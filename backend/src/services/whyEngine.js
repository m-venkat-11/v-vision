/**
 * Why Engine — Deterministic Rule-Based Explanation Generator
 * 
 * Generates natural plain-English explanations for all C constructs:
 * scalars, arrays, pointers, structs, functions, recursion, and heap memory.
 */

export function generateExplanation(event, prevVariables = {}, prevArrays = {}, prevStructs = {}, prevPointers = {}) {
  const { 
    eventType, 
    sourceLine, 
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

  switch (eventType) {
    case 'POINTER_CREATED':
    case 'POINTER_REASSIGNED': {
      if (pointerChanges && pointerChanges.length > 0) {
        const pc = pointerChanges[0];
        const ptrObj = pointers[pc.name];
        const targetDesc = ptrObj?.pointsToVar ? `variable ${ptrObj.pointsToVar}` : `address ${pc.to}`;
        return `Pointer ${pc.name} now points to ${targetDesc} (${pc.to}).`;
      }
      return `Executing pointer assignment: ${sourceLine}`;
    }

    case 'POINTER_DEREFERENCE': {
      const derefMatch = sourceLine.match(/\*(\w+)/);
      if (derefMatch) {
        const ptrName = derefMatch[1];
        const ptrObj = pointers ? pointers[ptrName] : null;
        const val = (ptrObj && ptrObj.dereferencedValue !== null && ptrObj.dereferencedValue !== undefined)
          ? ptrObj.dereferencedValue
          : 'value';
        if (sourceLine.includes('=')) {
          return `*${ptrName} writes or modifies the value at the address ${ptrName} points to (${val}).`;
        }
        return `*${ptrName} reads the value stored at the address ${ptrName} points to (${val}).`;
      }
      return `Dereferencing pointer: ${sourceLine}`;
    }

    case 'STRUCT_CREATED': {
      const sNames = Object.keys(structs).filter(k => !(k in prevStructs));
      if (sNames.length > 0) {
        const name = sNames[0];
        const fields = JSON.stringify(structs[name]).replace(/"/g, '').replace(/,/g, ', ');
        return `Instantiating struct ${name} with initial fields ${fields}.`;
      }
      return `Creating struct: ${sourceLine}`;
    }

    case 'STRUCT_FIELD_CHANGED': {
      if (structChanges && structChanges.length > 0) {
        const sc = structChanges[0];
        return `${sc.struct}.${sc.field} is updated from ${sc.from} to ${sc.to}.`;
      }
      return `Updating struct field: ${sourceLine}`;
    }

    case 'FUNCTION_CALLED': {
      const callMatch = sourceLine.match(/(\w+)\s*\(([^)]*)\)/);
      const calledFunc = callMatch ? callMatch[1] : funcName;
      const args = callMatch ? callMatch[2] : '';
      return `Calling function ${calledFunc}(${args}) — control jumps into the function body and a new frame is pushed onto the stack.`;
    }

    case 'RECURSIVE_CALL': {
      const callMatch = sourceLine.match(/(\w+)\s*\(([^)]*)\)/);
      const calledFunc = callMatch ? callMatch[1] : funcName;
      const args = callMatch ? callMatch[2] : '';
      return `Recursive call: ${calledFunc}(${args}) is pushed onto the call stack at depth ${callDepth} waiting for sub-problem result.`;
    }

    case 'FUNCTION_RETURNED': {
      return `Function ${funcName} returned. Control returns to the caller and its stack frame is popped.`;
    }

    case 'HEAP_ALLOCATED': {
      const allocMatch = sourceLine.match(/(\w+)\s*=\s*(?:\([^)]+\)\s*)?(?:malloc|calloc)\s*\(([^)]+)\)/);
      if (allocMatch) {
        const ptrName = allocMatch[1];
        const size = allocMatch[2];
        const ptrObj = pointers[ptrName];
        const addr = ptrObj?.targetAddress || 'heap';
        return `malloc reserves ${size} bytes on the heap at ${addr}, and ${ptrName} now points to it.`;
      }
      return `Dynamic memory allocated on heap: ${sourceLine}`;
    }

    case 'HEAP_FREED': {
      const freeMatch = sourceLine.match(/free\s*\(\s*(\w+)\s*\)/);
      if (freeMatch) {
        const ptrName = freeMatch[1];
        return `free(${ptrName}) releases the allocated memory block on the heap back to the operating system.`;
      }
      return `Releasing heap memory block: ${sourceLine}`;
    }

    case 'LOOP_STARTED': {
      const forMatch = sourceLine.match(/for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\S+?)\s*;\s*(\w+)\s*([<>=!]+)\s*(\S+?)\s*;/);
      if (forMatch) {
        const [, varName, initVal, condVar, op, limit] = forMatch;
        return `Starting for loop: ${varName} initialized to ${initVal}, runs while ${condVar} ${op} ${limit}.`;
      }
      return `Entering loop: ${sourceLine}`;
    }

    case 'LOOP_ITERATION': {
      if (loopState && loopState.currentLoop) {
        const loop = loopState.currentLoop;
        const iter = loop.iteration + 1;
        if (loop.variable && variables[loop.variable] !== undefined) {
          return `Loop iteration ${iter}: ${loop.variable} = ${variables[loop.variable]}.`;
        }
        return `Loop iteration ${iter}.`;
      }
      return `Advancing loop iteration: ${sourceLine}`;
    }

    case 'CONDITION_CHECKED': {
      const condMatch = sourceLine.match(/(?:if|else\s+if)\s*\((.+)\)/);
      const cond = condMatch ? condMatch[1] : sourceLine;
      const res = conditionResult === true ? 'TRUE (entering if-body)' : 'FALSE (skipping if-body)';
      return `Evaluating condition: ${cond} → Result is ${res}.`;
    }

    case 'ARRAY_CHANGED': {
      if (arrayChanges && arrayChanges.length > 0) {
        const ac = arrayChanges[0];
        if (ac.row !== undefined) {
          return `2D Array update: ${ac.array}[${ac.row}][${ac.col}] changed from ${ac.from} to ${ac.to}.`;
        }
        return `Array element ${ac.array}[${ac.index}] changed from ${ac.from} to ${ac.to}.`;
      }
      return `Modifying array element: ${sourceLine}`;
    }

    case 'ARRAY_ACCESS': {
      return `Reading array element: ${sourceLine}`;
    }

    case 'VARIABLE_CREATED': {
      const varEntries = Object.entries(variables).filter(([k]) => !(k in prevVariables));
      if (varEntries.length > 0) {
        const [k, v] = varEntries[0];
        return `Initializing variable ${k} with value ${v}.`;
      }
      return `Declaring variable: ${sourceLine}`;
    }

    case 'VARIABLE_CHANGED': {
      if (changes && changes.length > 0) {
        const c = changes[0];
        return `Variable ${c.name} updated from ${c.from} to ${c.to}.`;
      }
      return `Updating variable: ${sourceLine}`;
    }

    case 'PROGRAM_END': {
      return `Program execution reached return 0 and successfully terminated.`;
    }

    case 'RUNTIME_ERROR': {
      return `Runtime exception occurred during execution: ${event.runtimeError || 'Illegal Operation'}.`;
    }

    default:
      return `Executing: ${sourceLine}`;
  }
}
