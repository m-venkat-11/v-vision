import { runAndTrace } from './src/services/gdbRunner.js';

const GENERALITY_SUITE = [
  {
    id: 1,
    name: '1. Bubble / Selection / Insertion Sort',
    code: `#include <stdio.h>
int main() {
    int arr[] = {64, 25, 12, 22, 11};
    int n = 5;
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx])
                min_idx = j;
        }
        int temp = arr[min_idx];
        arr[min_idx] = arr[i];
        arr[i] = temp;
    }
    return 0;
}`
  },
  {
    id: 2,
    name: '2. Binary Search',
    code: `#include <stdio.h>
int binarySearch(int arr[], int l, int r, int x) {
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (arr[m] == x) return m;
        if (arr[m] < x) l = m + 1;
        else r = m - 1;
    }
    return -1;
}
int main() {
    int arr[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int n = 10;
    int target = 23;
    int result = binarySearch(arr, 0, n - 1, target);
    return 0;
}`
  },
  {
    id: 3,
    name: '3. Singly Linked List: insert, traverse, delete',
    code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

int main() {
    struct Node* head = NULL;
    struct Node* second = NULL;
    
    head = (struct Node*)malloc(sizeof(struct Node));
    second = (struct Node*)malloc(sizeof(struct Node));
    
    head->data = 10;
    head->next = second;
    
    second->data = 20;
    second->next = NULL;
    
    // Traverse
    int sum = 0;
    struct Node* curr = head;
    while (curr != NULL) {
        sum += curr->data;
        curr = curr->next;
    }
    
    // Delete
    free(second);
    free(head);
    head = NULL;
    return 0;
}`
  },
  {
    id: 4,
    name: '4. String Reversal and Palindrome Check',
    code: `#include <stdio.h>
#include <string.h>

int isPalindrome(char str[]) {
    int l = 0;
    int h = strlen(str) - 1;
    while (h > l) {
        if (str[l++] != str[h--]) {
            return 0;
        }
    }
    return 1;
}

int main() {
    char s[] = "radar";
    int pal = isPalindrome(s);
    return 0;
}`
  },
  {
    id: 5,
    name: '5. Recursive Fibonacci & Factorial',
    code: `#include <stdio.h>
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}
int main() {
    int f = fib(4);
    int fc = fact(3);
    return 0;
}`
  },
  {
    id: 6,
    name: '6. 2D Array Matrix Traversal / Sum',
    code: `#include <stdio.h>
int main() {
    int mat[3][3] = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
    };
    int total = 0;
    for (int r = 0; r < 3; r++) {
        for (int c = 0; c < 3; c++) {
            total += mat[r][c];
        }
    }
    return 0;
}`
  },
  {
    id: 7,
    name: '7. Struct-based Program (Student record)',
    code: `#include <stdio.h>
#include <string.h>

struct Student {
    int id;
    int score;
    char grade;
};

int main() {
    struct Student s1;
    s1.id = 101;
    s1.score = 92;
    if (s1.score >= 90) {
        s1.grade = 'A';
    } else {
        s1.grade = 'B';
    }
    return 0;
}`
  },
  {
    id: 8,
    name: '8. Dynamic Array (malloc & free)',
    code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 4;
    int *arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        arr[i] = (i + 1) * 10;
    }
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += arr[i];
    }
    free(arr);
    arr = NULL;
    return 0;
}`
  },
  {
    id: 9,
    name: '9. Nested Loops and Multiple Helper Functions Calling Each Other',
    code: `#include <stdio.h>

int square(int x) {
    return x * x;
}

int computeRow(int row, int cols) {
    int acc = 0;
    for (int c = 1; c <= cols; c++) {
        acc += square(row + c);
    }
    return acc;
}

int main() {
    int total = 0;
    for (int r = 1; r <= 2; r++) {
        total += computeRow(r, 2);
    }
    return 0;
}`
  }
];

async function runGeneralitySuite() {
  console.log('====================================================');
  console.log('   RUNNING 9 GENERALITY TEST SUITE PROGRAMS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const prog of GENERALITY_SUITE) {
    console.log(`>>> [Test ${prog.id}/9] ${prog.name}`);
    const t0 = Date.now();
    try {
      const res = await runAndTrace(prog.code);
      const dt = Date.now() - t0;
      if (res.success && res.timeline && res.timeline.length > 0) {
        console.log(`    ✅ SUCCESS (${dt}ms) — ${res.timeline.length} steps generated.`);
        const sampleEvent = res.timeline[Math.floor(res.timeline.length / 2)];
        console.log(`       Sample step ${sampleEvent.step} (L${sampleEvent.line}): ${sampleEvent.why}`);
        passed++;
      } else {
        console.log(`    ❌ FAILED (${dt}ms) — error: ${res.error || 'No steps generated'}`);
        failed++;
      }
    } catch (err) {
      console.log(`    ❌ EXCEPTION: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${GENERALITY_SUITE.length})`);
  console.log('====================================================');
}

runGeneralitySuite();
