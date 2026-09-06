import { runAndTrace } from './src/services/gdbRunner.js';

const ARBITRARY_PROGRAMS = [
  {
    name: '2D Matrix Transpose (Nested Loops & 2D Array)',
    code: `#include <stdio.h>
int main() {
    int m[2][2] = {{1, 2}, {3, 4}};
    int temp = m[0][1];
    m[0][1] = m[1][0];
    m[1][0] = temp;
    return 0;
}`
  },
  {
    name: 'Math Library Program (<math.h> sqrt & pow)',
    code: `#include <stdio.h>
#include <math.h>
int main() {
    double x = 9.0;
    double sq = sqrt(x);
    double p = pow(2.0, 3.0);
    return 0;
}`
  },
  {
    name: 'Strings and Characters (<string.h> strlen & char[])',
    code: `#include <stdio.h>
#include <string.h>
int main() {
    char str[] = "hello";
    int len = strlen(str);
    str[0] = 'H';
    return 0;
}`
  },
  {
    name: 'While and Do-While Loops with Break',
    code: `#include <stdio.h>
int main() {
    int count = 0;
    while (count < 3) {
        count++;
    }
    int j = 0;
    do {
        j += 2;
        if (j >= 4) break;
    } while (j < 10);
    return 0;
}`
  },
  {
    name: 'Switch Case Statement',
    code: `#include <stdio.h>
int main() {
    int choice = 2;
    int result = 0;
    switch (choice) {
        case 1: result = 100; break;
        case 2: result = 200; break;
        default: result = -1; break;
    }
    return 0;
}`
  },
  {
    name: 'Pointer Arithmetic',
    code: `#include <stdio.h>
int main() {
    int numbers[3] = {10, 20, 30};
    int *ptr = numbers;
    ptr++;
    *ptr = 99;
    return 0;
}`
  },
  {
    name: 'Multiple Helper Functions with Pass-by-Value',
    code: `#include <stdio.h>
int add(int a, int b) {
    return a + b;
}
int square(int x) {
    return x * x;
}
int main() {
    int s = add(3, 4);
    int sq = square(s);
    return 0;
}`
  },
  {
    name: 'Scanf Input Reading',
    code: `#include <stdio.h>
int main() {
    int a = 0;
    scanf("%d", &a);
    int b = a * 2;
    return 0;
}`
  }
];

async function runArbitraryTests() {
  console.log('=== RUNNING ARBITRARY C PROGRAMS SUITE ===\n');
  let passed = 0;

  for (const prog of ARBITRARY_PROGRAMS) {
    console.log(`Testing: ${prog.name}...`);
    const start = Date.now();
    const res = await runAndTrace(prog.code);
    const ms = Date.now() - start;

    if (!res.success) {
      console.error(`❌ FAILED: ${prog.name}`);
      console.error('Error:', res.error);
      process.exit(1);
    }

    console.log(`✅ PASSED (${ms}ms) — ${res.timeline.length} execution steps`);
    passed++;
  }

  console.log(`\n=== ALL ${passed}/${ARBITRARY_PROGRAMS.length} ARBITRARY C PROGRAMS PASSED FLAWLESSLY! ===`);
}

runArbitraryTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
