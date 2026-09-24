import { runAndTrace } from './src/services/gdbRunner.js';

// Test 1: Simple variables + arrays + loops
const testCode1 = `#include <stdio.h>
int main() {
  int a = 5, b = 10;
  int sum = a + b;
  printf("Sum = %d\\n", sum);
  if (sum > 10) {
    printf("Sum is greater than 10\\n");
  }
  int arr[5] = {1, 2, 3, 4, 5};
  for (int i = 0; i < 5; i++) {
    arr[i] = arr[i] * 2;
  }
  printf("Done\\n");
  return 0;
}`;

// Test 2: Swap with Pointers
const testCode2 = `#include <stdio.h>

void swap(int *a, int *b) {
  int temp = *a;
  *a = *b;
  *b = temp;
}

int main() {
  int x = 10, y = 20;
  printf("Before: x=%d, y=%d\\n", x, y);
  swap(&x, &y);
  printf("After: x=%d, y=%d\\n", x, y);
  return 0;
}`;

// Test 3: Fibonacci (recursion)
const testCode3 = `#include <stdio.h>

int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
  int n = 5;
  int result = fibonacci(n);
  printf("Fibonacci(%d) = %d\\n", n, result);
  return 0;
}`;

// Test 4: Bubble Sort
const testCode4 = `#include <stdio.h>

int main() {
  int arr[] = {5, 3, 8, 1, 2};
  int n = 5;
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j+1]) {
        int temp = arr[j];
        arr[j] = arr[j+1];
        arr[j+1] = temp;
      }
    }
  }
  for (int i = 0; i < n; i++) {
    printf("%d ", arr[i]);
  }
  printf("\\n");
  return 0;
}`;

// Test 5: scanf with input
const testCode5 = `#include <stdio.h>

int main() {
  int n;
  scanf("%d", &n);
  int sum = 0;
  for (int i = 1; i <= n; i++) {
    sum += i;
  }
  printf("Sum of 1 to %d = %d\\n", n, sum);
  return 0;
}`;

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest(name, code, input = '') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`${'='.repeat(60)}`);
  
  const result = await runAndTrace(code, input);
  
  if (result.success) {
    console.log(`✅ SUCCESS: ${result.timeline.length} events`);
    
    let issues = [];
    let arrayStates = [];
    
    for (const ev of result.timeline) {
      // Check for garbage values leaking through
      for (const [k, v] of Object.entries(ev.variables || {})) {
        if (typeof v === 'number' && Math.abs(v) > 1000000) {
          issues.push(`  ⚠️ Step ${ev.step} L${ev.line}: Garbage value ${k}=${v}`);
        }
      }
      
      // Check for empty variable state when vars should exist
      if (ev.step > 2 && Object.keys(ev.variables || {}).length === 0 && ev.eventType !== 'PROGRAM_END') {
        issues.push(`  ⚠️ Step ${ev.step} L${ev.line}: Empty variables dict`);
      }
      
      // Show first few steps in detail
      if (ev.step < 6) {
        const vars = Object.entries(ev.variables || {}).map(([k,v]) => `${k}=${v}`).join(', ');
        const arrs = Object.entries(ev.arrays || {}).map(([k,v]) => `${k}=[${Array.isArray(v) ? v.join(',') : v}]`).join(', ');
        console.log(`  Step ${ev.step}: L${ev.line} [${ev.eventType}] "${ev.sourceLine}"`);
        if (vars) console.log(`    vars: ${vars}`);
        if (arrs) console.log(`    arrays: ${arrs}`);
      }
      
      // Track array change events
      if (ev.eventType === 'ARRAY_CHANGED' && ev.arrays) {
        for (const [arrName, arrVal] of Object.entries(ev.arrays)) {
          if (Array.isArray(arrVal)) {
            arrayStates.push(`  Step ${ev.step} [ARRAY_CHANGED]: ${arrName} = [${arrVal.join(', ')}]`);
          }
        }
      }
    }
    
    if (issues.length > 0) {
      console.log(`\n  ❌ ISSUES (${issues.length}):`);
      issues.forEach(i => console.log(i));
    } else {
      console.log(`  ✅ No garbage value issues detected!`);
    }
    
    if (arrayStates.length > 0) {
      console.log(`\n  Array mutation tracking (${arrayStates.length} ARRAY_CHANGED events):`);
      arrayStates.slice(0, 10).forEach(s => console.log(s));
      if (arrayStates.length > 10) console.log(`  ... and ${arrayStates.length - 10} more`);
    }
    
    const lastEvent = result.timeline[result.timeline.length - 1];
    if (lastEvent?.stdout) {
      console.log(`\n  Final stdout: ${JSON.stringify(lastEvent.stdout)}`);
    }
  } else {
    console.log(`❌ FAILED: [${result.errorType}] ${result.error}`);
  }
}

// Run tests sequentially with delays to avoid file locking
await runTest('Simple Variables + Arrays + Loops', testCode1);
await delay(500);
await runTest('Swap with Pointers', testCode2);
await delay(500);
await runTest('Fibonacci (Recursion)', testCode3);
await delay(500);
await runTest('Bubble Sort', testCode4);
await delay(500);
await runTest('Scanf with Input', testCode5, '10');

console.log('\n\n✅ All tests completed.');
