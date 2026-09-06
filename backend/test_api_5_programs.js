const PROGRAMS = [
  {
    name: '1. Loop & Array (Find Max)',
    code: `#include <stdio.h>
int main() {
    int a[] = {4, 9, 2};
    int max = a[0];
    for (int i = 1; i < 3; i++) {
        if (a[i] > max) max = a[i];
    }
    return 0;
}`
  },
  {
    name: '2. Pointer Swap',
    code: `#include <stdio.h>
void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}
int main() {
    int x = 10, y = 20;
    swap(&x, &y);
    return 0;
}`
  },
  {
    name: '3. Struct Point',
    code: `#include <stdio.h>
struct Point {
    int x;
    int y;
};
int main() {
    struct Point p = {10, 20};
    p.x = 99;
    return 0;
}`
  },
  {
    name: '4. Recursion Factorial',
    code: `#include <stdio.h>
int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}
int main() {
    int r = fact(3);
    return 0;
}`
  },
  {
    name: '5. Dynamic Heap Memory (malloc & free)',
    code: `#include <stdio.h>
#include <stdlib.h>
int main() {
    int *arr = (int*)malloc(sizeof(int) * 2);
    arr[0] = 42;
    free(arr);
    return 0;
}`
  }
];

async function testAll() {
  for (const p of PROGRAMS) {
    console.log(`\n========================================`);
    console.log(`Testing: ${p.name}`);
    const res = await fetch('http://localhost:3001/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: p.code })
    });
    const data = await res.json();
    console.log('Success:', data.success, 'Total Steps:', data.totalSteps || 0);
    if (!data.success) {
      console.error('Error:', data.error);
    } else {
      console.log('Sample steps:');
      data.timeline.slice(0, 3).forEach(s => {
        console.log(`  Step ${s.step}: [${s.eventType}] ${s.why}`);
      });
      const last = data.timeline[data.timeline.length - 1];
      console.log(`  Final Step ${last.step}: [${last.eventType}] ${last.why}`);
    }
  }
}

testAll().catch(console.error);
