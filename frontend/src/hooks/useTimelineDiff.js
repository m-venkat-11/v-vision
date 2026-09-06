import { useMemo } from 'react';

/**
 * Custom hook to compute granular deltas between currentEvent and prevEvent.
 * Enables views to animate only changed state instead of re-rendering everything.
 */
export function useTimelineDiff(currentEvent, prevEvent) {
  return useMemo(() => {
    if (!currentEvent) {
      return {
        hasChanges: false,
        changedVars: new Set(),
        changedArrays: new Set(),
        changedPointers: new Set(),
        changedStructs: new Set(),
        isCallPush: false,
        isCallPop: false,
        newHeapBlock: null,
        freedHeapBlock: null
      };
    }

    const prevVars = prevEvent?.variables || {};
    const curVars = currentEvent.variables || {};

    const changedVars = new Set();
    for (const [k, v] of Object.entries(curVars)) {
      if (prevVars[k] !== v) {
        changedVars.add(k);
      }
    }

    const prevArr = prevEvent?.arrays || {};
    const curArr = currentEvent.arrays || {};
    const changedArrays = new Set();
    for (const [name, arr] of Object.entries(curArr)) {
      if (!prevArr[name] || JSON.stringify(prevArr[name]) !== JSON.stringify(arr)) {
        changedArrays.add(name);
      }
    }

    const prevPointers = prevEvent?.pointers || {};
    const curPointers = currentEvent.pointers || {};
    const changedPointers = new Set();
    for (const [name, ptr] of Object.entries(curPointers)) {
      if (!prevPointers[name] || prevPointers[name].targetAddress !== ptr.targetAddress) {
        changedPointers.add(name);
      }
    }

    const prevStructs = prevEvent?.structs || {};
    const curStructs = currentEvent.structs || {};
    const changedStructs = new Set();
    for (const [name, st] of Object.entries(curStructs)) {
      if (!prevStructs[name] || JSON.stringify(prevStructs[name]) !== JSON.stringify(st)) {
        changedStructs.add(name);
      }
    }

    const prevDepth = prevEvent?.callDepth || 1;
    const curDepth = currentEvent.callDepth || 1;
    const isCallPush = curDepth > prevDepth;
    const isCallPop = curDepth < prevDepth;

    // Heap diffs
    const prevAlloc = prevEvent?.heapAllocations || [];
    const curAlloc = currentEvent.heapAllocations || [];
    const newHeapBlock = curAlloc.find(a => !prevAlloc.some(p => p.address === a.address));
    const freedHeapBlock = curAlloc.find(a => a.freed && !prevAlloc.some(p => p.address === a.address && p.freed));

    return {
      hasChanges: changedVars.size > 0 || changedArrays.size > 0 || changedPointers.size > 0 || changedStructs.size > 0 || isCallPush || isCallPop,
      changedVars,
      changedArrays,
      changedPointers,
      changedStructs,
      isCallPush,
      isCallPop,
      newHeapBlock,
      freedHeapBlock
    };
  }, [currentEvent, prevEvent]);
}
