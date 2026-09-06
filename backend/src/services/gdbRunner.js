/**
 * GDB Runner Service (Isolated Execution Module for V-VISION)
 * 
 * Compiles arbitrary C code using gcc -std=c11 -g -O0 -Wall ... -lm and steps through execution
 * using GDB's MI2 interface (-exec-step for user functions, recursion, and calls).
 * 
 * Works for ANY valid C code: arrays (1D/2D), pointers, structs, recursion, malloc/free, loops,
 * functions, math library, etc.
 * 
 * Encapsulates all MinGW / OS-specific execution. Exposes ONLY:
 *   runAndTrace(code: string) -> Promise<{ success, timeline, error, errorType, sourceLines }>
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { 
  parseMILocals, 
  parseCallStack, 
  parseFrameInfo, 
  parseExpressionValue,
  parseStructFields,
  parseArrayValue 
} from './miParser.js';
import { buildTimeline } from './timelineBuilder.js';

const MAX_STEPS = 500;
const GDB_TIMEOUT_MS = 25000;
const TEMP_DIR = join(process.cwd(), '.temp_build');

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Public execution entry point.
 * Accepts any valid C code string, executes it, and returns the structured timeline.
 */
export async function runAndTrace(sourceCode) {
  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return {
      success: false,
      error: 'No C source code provided.',
      errorType: 'validation'
    };
  }

  const id = uuidv4().slice(0, 8);
  const srcName = `prog_${id}.c`;
  const exeName = `prog_${id}.exe`;
  const srcPath = join(TEMP_DIR, srcName);
  const exePath = join(TEMP_DIR, exeName);

  try {
    // Step 1: Write source code. If scanf / getchar is used, inject non-blocking in-memory stream with #line directive
    let finalSource = sourceCode;
    if (/scanf|getchar|getc/.test(sourceCode)) {
      finalSource = `#include <stdio.h>\nstatic const char *__v_in = "10 20 30 40 50 60 70 80 90 100 42 99\\nhello\\nworld\\n";\n#define scanf(fmt, ...) sscanf(__v_in, fmt, __VA_ARGS__)\n#define getchar() 'A'\n#line 1 "${srcName}"\n${sourceCode}`;
    }
    writeFileSync(srcPath, finalSource, 'utf-8');

    // Step 2: Compile with debug symbols, warnings, and math library (-lm)
    const compileResult = compileCode(srcPath, exePath);
    if (!compileResult.success) {
      return {
        success: false,
        error: compileResult.error,
        errorType: 'compile'
      };
    }

    const sourceLines = sourceCode.split('\n');

    // Step 3: Run GDB session within isolated TEMP_DIR
    const gdbResult = await stepThroughGDB(exeName, sourceLines, TEMP_DIR);

    if (!gdbResult.success) {
      return {
        success: false,
        error: gdbResult.error,
        errorType: gdbResult.errorType || 'runtime'
      };
    }

    // Step 4: Build timeline from raw GDB execution steps
    const timeline = buildTimeline(gdbResult.rawSteps, sourceLines, gdbResult.heapState);

    return {
      success: true,
      timeline,
      sourceLines,
      totalSteps: timeline.length,
      compilerWarnings: compileResult.warnings || []
    };

  } finally {
    // Cleanup temporary files
    cleanup(srcPath, exePath);
  }
}

/**
 * Compile C code with gcc -std=c11 -g -O0 -Wall ... -lm
 */
function compileCode(srcPath, exePath) {
  try {
    const output = execSync(`gcc -std=c11 -g -O0 -Wall -o "${exePath}" "${srcPath}" -lm 2>&1`, {
      encoding: 'utf-8',
      timeout: 10000
    });

    const warnings = [];
    if (output && output.trim()) {
      const cleanWarnings = sanitizeError(output, srcPath, exePath);
      warnings.push(cleanWarnings);
    }

    return { success: true, warnings };
  } catch (err) {
    const rawError = err.stdout || err.stderr || err.message || 'Compilation failed';
    const cleanError = sanitizeError(rawError, srcPath, exePath);
    return { success: false, error: cleanError };
  }
}

function sanitizeError(msg, srcPath, exePath) {
  return msg
    .replace(new RegExp(srcPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'main.c')
    .replace(new RegExp(exePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'main.exe')
    .trim();
}

/**
 * Drive GDB via MI2 with clean synchronization separating query commands from exec commands.
 */
function stepThroughGDB(exeName, sourceLines, workDir) {
  return new Promise((resolve) => {
    const rawSteps = [];
    const heapState = {
      allocations: []
    };

    let buffer = '';
    let responseLines = [];
    let commandResolve = null;
    let waitingForStop = false;
    let stepCount = 0;
    let programExited = false;
    let runtimeError = null;
    let timeoutHandle = null;

    const gdb = spawn('gdb', ['--interpreter=mi2', '--quiet', exeName], {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Timeout guard (kill after 10s to prevent infinite loops)
    timeoutHandle = setTimeout(() => {
      programExited = true;
      try { gdb.kill('SIGKILL'); } catch (e) {}
      resolve({
        success: false,
        error: 'Execution timed out (>10s). Check for infinite loops or uncontrolled recursion.',
        errorType: 'timeout'
      });
    }, GDB_TIMEOUT_MS);

    function sendQuery(cmd) {
      return new Promise((res) => {
        responseLines = [];
        waitingForStop = false;
        commandResolve = res;
        gdb.stdin.write(cmd + '\n');
      });
    }

    function sendExec(cmd) {
      return new Promise((res) => {
        responseLines = [];
        waitingForStop = true;
        commandResolve = res;
        gdb.stdin.write(cmd + '\n');
      });
    }

    gdb.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === '(gdb)') continue;

        responseLines.push(line);

        // Check for program exit
        if (line.includes('*stopped') && (line.includes('exited') || line.includes('exited-normally'))) {
          programExited = true;
        }

        // Check for runtime exceptions (SIGSEGV, SIGFPE, etc.)
        if (line.includes('*stopped') && line.includes('reason="signal-received"')) {
          const sigMatch = line.match(/signal-name="([^"]+)"/);
          const sigMeaning = line.match(/signal-meaning="([^"]+)"/);
          const signalName = sigMatch ? sigMatch[1] : 'CRASH';
          const signalDesc = sigMeaning ? sigMeaning[1] : 'Runtime Exception';

          runtimeError = {
            signal: signalName,
            description: signalDesc,
            line: parseFrameInfo(line)?.line || null
          };
          programExited = true;
        }

        if (waitingForStop) {
          // Execution commands resolve only when program actually stops (*stopped) or errors (^error)
          if (line.startsWith('*stopped') || line.startsWith('^error')) {
            waitingForStop = false;
            if (commandResolve) {
              const res = [...responseLines];
              responseLines = [];
              const r = commandResolve;
              commandResolve = null;
              r(res);
            }
          }
        } else {
          // Query commands resolve on ^done or ^error
          if (line.startsWith('^done') || line.startsWith('^error')) {
            if (commandResolve) {
              const res = [...responseLines];
              responseLines = [];
              const r = commandResolve;
              commandResolve = null;
              r(res);
            }
          }
        }
      }
    });

    gdb.on('close', () => {
      clearTimeout(timeoutHandle);
      if (commandResolve) commandResolve(responseLines);
    });

    async function execute() {
      try {
        // Insert breakpoint at main
        await sendQuery('-break-insert main');

        // Run program and wait for breakpoint stop
        const runRes = await sendExec('-exec-run');
        const runStr = runRes.join('\n');
        if (runStr.includes('^error')) {
          throw new Error('Could not launch program: ' + runStr);
        }

        let lastKnownVars = {};
        let lastKnownArrays = {};
        let lastKnownStructs = {};
        let lastKnownPointers = {};
        const addressCache = {}; // Cache variable addresses to avoid redundant queries

        // Main stepping loop
        while (!programExited && stepCount < MAX_STEPS) {
          // Get current frame info
          const frameRes = await sendQuery('-stack-info-frame');
          const frameInfo = parseFrameInfo(frameRes.join('\n'));

          if (!frameInfo || !frameInfo.line) {
            if (programExited || rawSteps.length > 0) break;
            const stepRes = await sendExec('-exec-next');
            if (stepRes.join('\n').includes('exited') || programExited) break;
            continue;
          }

          const lineNum = parseInt(frameInfo.line, 10);
          const currentFunc = frameInfo.func || 'main';

          // If execution landed in system library or crt (outside user source code), finish out of it or break if main exited
          if (currentFunc.startsWith('__') || (frameInfo.file && !frameInfo.file.includes('.c') && currentFunc !== 'main')) {
            if (rawSteps.length > 0) {
              break;
            }
            const finishRes = await sendExec('-exec-finish');
            if (finishRes.join('\n').includes('exited') || programExited) break;
            continue;
          }

          const sourceLine = (lineNum >= 1 && lineNum <= sourceLines.length)
            ? sourceLines[lineNum - 1].trim()
            : '';

          // 1. Get Call Stack (all frames for recursion & call hierarchy)
          const stackRes = await sendQuery('-stack-list-frames');
          const callStack = parseCallStack(stackRes.join('\n'));

          // 2. Get local variables
          let localsRes = await sendQuery('-stack-list-locals --all-values');
          let locals = parseMILocals(localsRes.join('\n'));

          if (Object.keys(locals).length === 0 && Object.keys(lastKnownVars).length > 0) {
            await new Promise(r => setTimeout(r, 20));
            localsRes = await sendQuery('-stack-list-locals --all-values');
            locals = parseMILocals(localsRes.join('\n'));
          }

          const variables = {};
          const arrays = {};
          const structs = {};
          const pointers = {};

          // Categorize and parse variables
          for (const [name, rawVal] of Object.entries(locals)) {
            if (name === 'argc' || name === 'argv') continue;

            // Check if pointer (hex address like 0x61fe14 or 0x0)
            if (typeof rawVal === 'string' && /^0x[0-9a-fA-F]+$/.test(rawVal.trim())) {
              const targetAddr = rawVal.trim();
              let derefVal = null;
              if (targetAddr !== '0x0' && targetAddr !== '0x00000000') {
                try {
                  const derefRes = await sendQuery(`-data-evaluate-expression *${name}`);
                  const parsedDeref = parseExpressionValue(derefRes.join('\n'));
                  if (parsedDeref && !parsedDeref.includes('Cannot access memory')) {
                    derefVal = isNaN(parseFloat(parsedDeref)) ? parsedDeref : parseFloat(parsedDeref);
                  }
                } catch (e) {}
              }

              // Query address of pointer variable itself
              let selfAddr = addressCache['&' + name] || '';
              if (!selfAddr) {
                try {
                  const addrRes = await sendQuery(`-data-evaluate-expression &${name}`);
                  selfAddr = parseExpressionValue(addrRes.join('\n')) || '';
                  if (selfAddr) addressCache['&' + name] = selfAddr;
                } catch (e) {}
              }

              pointers[name] = {
                name,
                address: selfAddr,
                targetAddress: targetAddr,
                dereferencedValue: derefVal,
                pointsToVar: null
              };
              variables[name] = targetAddr;
              continue;
            }

            // Check if struct ({x = 10, y = 20})
            if (typeof rawVal === 'string' && rawVal.startsWith('{') && rawVal.includes('=')) {
              const structFields = parseStructFields(rawVal);
              if (structFields) {
                structs[name] = structFields;
                continue;
              }
            }

            // Check if array ({1, 2, 3} or {{1, 2}, {3, 4}})
            if (typeof rawVal === 'string' && rawVal.startsWith('{')) {
              const parsedArr = parseArrayValue(rawVal);
              if (parsedArr) {
                arrays[name] = parsedArr;
                continue;
              }
            }

            // Scalar variable (int, float, char, double)
            const num = parseFloat(rawVal);
            variables[name] = isNaN(num) ? rawVal : num;
          }

          // Resolve which local variable pointers point to
          for (const ptr of Object.values(pointers)) {
            if (ptr.targetAddress && ptr.targetAddress !== '0x0') {
              for (const [vName] of Object.entries(variables)) {
                if (vName !== ptr.name) {
                  let vAddr = addressCache[vName];
                  if (!vAddr) {
                    try {
                      const addrRes = await sendQuery(`-data-evaluate-expression &${vName}`);
                      vAddr = parseExpressionValue(addrRes.join('\n'));
                      if (vAddr) addressCache[vName] = vAddr;
                    } catch (e) {}
                  }
                  if (vAddr && vAddr.toLowerCase() === ptr.targetAddress.toLowerCase()) {
                    ptr.pointsToVar = vName;
                    break;
                  }
                }
              }
            }
          }

          // Track Heap allocations: malloc / calloc / free
          if (sourceLine.includes('malloc') || sourceLine.includes('calloc')) {
            const assignMatch = sourceLine.match(/(\w+)\s*=\s*(?:\([^)]+\)\s*)?(?:malloc|calloc)\s*\(([^)]+)\)/);
            if (assignMatch) {
              const ptrName = assignMatch[1];
              const sizeExpr = assignMatch[2].trim();
              const ptrObj = pointers[ptrName];
              if (ptrObj && ptrObj.targetAddress && ptrObj.targetAddress !== '0x0') {
                const existing = heapState.allocations.find(a => a.address === ptrObj.targetAddress && !a.freed);
                if (!existing) {
                  heapState.allocations.push({
                    address: ptrObj.targetAddress,
                    sizeExpr,
                    variable: ptrName,
                    step: stepCount,
                    line: lineNum,
                    freed: false
                  });
                }
              }
            }
          }

          if (sourceLine.includes('free')) {
            const freeMatch = sourceLine.match(/free\s*\(\s*(\w+)\s*\)/);
            if (freeMatch) {
              const ptrName = freeMatch[1];
              const ptrObj = pointers[ptrName];
              if (ptrObj && ptrObj.targetAddress) {
                const alloc = heapState.allocations.find(a => a.address === ptrObj.targetAddress && !a.freed);
                if (alloc) {
                  alloc.freed = true;
                  alloc.freedLine = lineNum;
                }
              }
            }
          }

          // Fallback to last known state if empty
          if (Object.keys(variables).length === 0 && Object.keys(arrays).length === 0) {
            Object.assign(variables, lastKnownVars);
            Object.assign(arrays, lastKnownArrays);
            Object.assign(structs, lastKnownStructs);
            Object.assign(pointers, lastKnownPointers);
          } else {
            lastKnownVars = { ...variables };
            lastKnownArrays = JSON.parse(JSON.stringify(arrays));
            lastKnownStructs = JSON.parse(JSON.stringify(structs));
            lastKnownPointers = JSON.parse(JSON.stringify(pointers));
          }

          // Record step
          const step = {
            step: stepCount,
            line: lineNum,
            function: currentFunc,
            callDepth: callStack.length > 0 ? callStack.length : 1,
            callStack: callStack.length > 0 ? callStack : [{ level: 0, func: currentFunc, line: lineNum }],
            sourceLine,
            variables: { ...variables },
            arrays: { ...arrays },
            structs: { ...structs },
            pointers: { ...pointers },
            heapAllocations: JSON.parse(JSON.stringify(heapState.allocations))
          };

          rawSteps.push(step);
          stepCount++;

          // Step into user functions; step over library calls
          const isStdLib = /printf|scanf|puts|putchar|malloc|free|calloc|realloc|exit/.test(sourceLine);
          const nextRes = isStdLib ? await sendExec('-exec-next') : await sendExec('-exec-step');
          const nextStr = nextRes.join('\n');

          if (nextStr.includes('exited') || nextStr.includes('^error') || programExited) {
            break;
          }
        }

        // Check for runtime error (segfault, stack overflow)
        if (runtimeError) {
          rawSteps.push({
            step: stepCount,
            line: runtimeError.line || (rawSteps[rawSteps.length - 1]?.line) || 1,
            function: rawSteps[rawSteps.length - 1]?.function || 'main',
            callDepth: rawSteps[rawSteps.length - 1]?.callDepth || 1,
            callStack: rawSteps[rawSteps.length - 1]?.callStack || [],
            sourceLine: '',
            isRuntimeError: true,
            runtimeError: `${runtimeError.signal}: ${runtimeError.description}`,
            variables: rawSteps[rawSteps.length - 1]?.variables || {},
            arrays: rawSteps[rawSteps.length - 1]?.arrays || {},
            structs: rawSteps[rawSteps.length - 1]?.structs || {},
            pointers: rawSteps[rawSteps.length - 1]?.pointers || {},
            heapAllocations: heapState.allocations
          });
        }

        try { await sendQuery('-gdb-exit'); } catch (e) {}

        if (stepCount >= MAX_STEPS && !programExited) {
          try { gdb.kill(); } catch (e) {}
          return resolve({
            success: false,
            error: `Step limit exceeded (>${MAX_STEPS} steps). Try a smaller input or shorter loop.`,
            errorType: 'stepcap'
          });
        }

        resolve({
          success: true,
          rawSteps,
          heapState
        });

      } catch (err) {
        try { gdb.kill(); } catch (e) {}
        resolve({
          success: false,
          error: err.message || 'Execution error in GDB',
          errorType: 'runtime'
        });
      }
    }

    execute();
  });
}

function cleanup(srcPath, exePath) {
  try { if (existsSync(srcPath)) unlinkSync(srcPath); } catch (e) {}
  try { if (existsSync(exePath)) unlinkSync(exePath); } catch (e) {}
}


