/**
 * Starter Templates for "Write Your Own Code" Playground
 * Each template is a complete, valid C program illustrating different C constructs.
 */

export const CUSTOM_STARTER_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank main()',
    category: 'Starter',
    description: 'Clean minimal C boilerplate ready for your own code',
    input: '',
    code: `#include <stdio.h>

int main() {
    // Write your C code here!
    int a = 10;
    int b = 20;
    int result = a + b;

    printf("Result: %d\\n", result);
    return 0;
}`
  },
  {
    id: 'variables-math',
    name: 'Variables & Math',
    category: 'Fundamentals',
    description: 'Scalar variables, arithmetic calculations, and formatting',
    input: '',
    code: `#include <stdio.h>

int main() {
    int a = 15;
    int b = 4;

    int sum = a + b;
    int diff = a - b;
    int prod = a * b;
    float div = (float)a / b;

    printf("Sum: %d, Diff: %d, Prod: %d, Div: %.2f\\n", sum, diff, prod, div);
    return 0;
}`
  },
  {
    id: 'stdin-input',
    name: 'User Input (scanf)',
    category: 'I/O',
    description: 'Interactive standard input using scanf with test data',
    input: '8 15',
    code: `#include <stdio.h>

int main() {
    int x, y;
    printf("Reading two integers from input...\\n");
    scanf("%d %d", &x, &y);

    int max = (x > y) ? x : y;
    int min = (x < y) ? x : y;

    printf("Values read: x=%d, y=%d\\n", x, y);
    printf("Max: %d, Min: %d\\n", max, min);
    return 0;
}`
  },
  {
    id: 'array-loop',
    name: 'Array & Loop Search',
    category: 'Arrays',
    description: '1D array traversal with loop counter and max finding',
    input: '',
    code: `#include <stdio.h>

int main() {
    int nums[] = {14, 52, 9, 36, 78, 23};
    int n = sizeof(nums) / sizeof(nums[0]);
    int maxVal = nums[0];
    int maxIdx = 0;

    for (int i = 1; i < n; i++) {
        if (nums[i] > maxVal) {
            maxVal = nums[i];
            maxIdx = i;
        }
    }

    printf("Max value %d found at index %d\\n", maxVal, maxIdx);
    return 0;
}`
  },
  {
    id: 'matrix-2d',
    name: '2D Matrix Grid',
    category: '2D Arrays',
    description: 'Nested loops traversing and computing row sums of a 2D matrix',
    input: '',
    code: `#include <stdio.h>

int main() {
    int matrix[3][3] = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
    };

    int totalSum = 0;
    for (int r = 0; r < 3; r++) {
        int rowSum = 0;
        for (int c = 0; c < 3; c++) {
            rowSum += matrix[r][c];
        }
        totalSum += rowSum;
        printf("Row %d sum = %d\\n", r, rowSum);
    }

    printf("Total matrix sum = %d\\n", totalSum);
    return 0;
}`
  },
  {
    id: 'pointers-ref',
    name: 'Pointers & References',
    category: 'Pointers',
    description: 'Pointer variables, addresses, and value dereferencing',
    input: '',
    code: `#include <stdio.h>

int main() {
    int val = 42;
    int *ptr = &val;

    printf("Initial val = %d\\n", val);
    *ptr = 99;
    printf("Updated val via *ptr = %d\\n", val);

    int other = 120;
    ptr = &other;
    printf("Now ptr points to other = %d\\n", *ptr);

    return 0;
}`
  },
  {
    id: 'dynamic-heap',
    name: 'Dynamic Heap (malloc/free)',
    category: 'Memory',
    description: 'Dynamic memory allocation on the heap and safe deallocation',
    input: '',
    code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int count = 4;
    int *buffer = (int*)malloc(count * sizeof(int));

    for (int i = 0; i < count; i++) {
        buffer[i] = (i + 1) * 25;
        printf("buffer[%d] = %d\\n", i, buffer[i]);
    }

    free(buffer);
    printf("Heap memory freed successfully\\n");
    return 0;
}`
  }
];
