import { runAndTrace } from './src/services/gdbRunner.js';

const PROGRAMS = [
  {
    name: '1. Loop & Array (Find Max)',
    code: `
#include <stdio.h>
int main() {
    int a[] = {4, 9, 2};
    int max = a[0];
    for (int i = 1; i < 3; i++) {
        if (a[i] > max) max = a[i];
    }
    return 0;
}
`
  },
  {
    name: '2. Pointer Swap',
    code: `
#include <stdio.h>
void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}
int main() {
    int x = 10, y = 20;
    swap(&x, &y);
    return 0;
}
`
  },
  {
    name: '3. Struct Point',
    code: `
#include <stdio.h>
struct Point {
    int x;
    int y;
};
int main() {
    struct Point p = {10, 20};
    p.x = 99;
    return 0;
}
`
  },
  {
    name: '4. Recursion (Factorial)',
    code: `
#include <stdio.h>
int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}
int main() {
    int r = fact(3);
    return 0;
}
`
  },
  {
    name: '5. Dynamic Heap Memory (malloc & free)',
    code: `
#include <stdio.h>
#include <stdlib.h>
int main() {
    int *arr = (int*)malloc(sizeof(int) * 2);
    arr[0] = 42;
    free(arr);
    return 0;
}
`
  }
];

async function runTests() {
  console.log('=== STARTING 5 CORE PROGRAMS EXECUTION TEST ===\n');

  for (const prog of PROGRAMS) {
    console.log(`>>> Testing: ${prog.name}...`);
    const start = Date.now();
    const result = await runAndTrace(prog.code);
    const elapsed = Date.now() - start;

    if (!result.success) {
      console.error(`❌ FAILED: ${prog.name}`);
      console.error('Error:', result.error);
      process.exit(1);
    }

    console.log(`✅ SUCCESS (${elapsed}ms) — Generated ${result.timeline.length} steps.`);
    
    // Sample first and middle event
    const events = result.timeline;
    console.log(`   Sample step 1: [L${events[0]?.line} ${events[0]?.eventType}] ${events[0]?.why}`);
    if (events.length > 2) {
      const mid = Math.floor(events.length / 2);
      console.log(`   Sample mid step: [L${events[mid]?.line} ${events[mid]?.eventType}] ${events[mid]?.why}`);
    }
    const last = events[events.length - 1];
    console.log(`   Sample final step: [L${last?.line} ${last?.eventType}] ${last?.why}\n`);
  }

  console.log('=== ALL 5 CORE PROGRAMS PASSED PERFECTLY ===');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
