/**
 * Core C Program Presets for V-VISION
 * Includes all 5 core required test programs:
 * 1. Loop & Array
 * 2. Pointer Swap
 * 3. Structs
 * 4. Recursion
 * 5. Dynamic Heap Memory (malloc / free)
 * plus 2D Matrices and Sorting
 */
export const EXAMPLE_PROGRAMS = [
  {
    id: 'pointer-swap',
    name: 'Pointer Swap',
    category: 'Pointers',
    complexity: 'O(1)',
    description: 'Swaps values of two variables in-place using pointer dereferencing (*a = *b)',
    code: `#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 10;
    int y = 20;

    printf("Before swap: x=%d, y=%d\\n", x, y);
    swap(&x, &y);
    printf("After swap: x=%d, y=%d\\n", x, y);

    return 0;
}`
  },
  {
    id: 'recursion-factorial',
    name: 'Recursion: Factorial',
    category: 'Recursion & Call Stack',
    complexity: 'O(n)',
    description: 'Computes factorial recursively, visualizing stack frame push/pop and tree unrolling',
    code: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int n = 3;
    int result = factorial(n);
    printf("Factorial of %d is %d\\n", n, result);
    return 0;
}`
  },
  {
    id: 'struct-point',
    name: 'Struct: Coordinates',
    category: 'Structs',
    complexity: 'O(1)',
    description: 'Instantiates a composite struct and mutates internal fields independently',
    code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main() {
    struct Point p = {10, 25};
    
    p.x = 99;
    p.y += 15;

    printf("Point coordinates: (%d, %d)\\n", p.x, p.y);
    return 0;
}`
  },
  {
    id: 'heap-memory',
    name: 'Heap: malloc & free',
    category: 'Dynamic Memory',
    complexity: 'O(1)',
    description: 'Allocates dynamic memory block on the heap, initializes data, and frees it cleanly',
    code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int size = 3;
    int *arr = (int*)malloc(sizeof(int) * size);

    arr[0] = 10;
    arr[1] = 20;
    arr[2] = 30;

    printf("Heap array: %d, %d, %d\\n", arr[0], arr[1], arr[2]);

    free(arr);
    printf("Memory freed successfully\\n");
    return 0;
}`
  },
  {
    id: 'find-max',
    name: 'Find Maximum',
    category: 'Arrays',
    complexity: 'O(n)',
    description: 'Iterates through an array to find and track the largest value',
    code: `#include <stdio.h>

int main() {
    int a[] = {4, 8, 2, 9, 1};
    int n = 5;
    int max = a[0];
    int i;

    for (i = 1; i < n; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }

    printf("Maximum element is: %d\\n", max);
    return 0;
}`
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'Sorting',
    complexity: 'O(n²)',
    description: 'Swaps adjacent out-of-order elements with nested loop and comparison animation',
    code: `#include <stdio.h>

int main() {
    int a[] = {5, 3, 8, 1, 2};
    int n = 5;
    int i, j, temp;

    for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                temp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = temp;
            }
        }
    }

    printf("Sorted array complete!\\n");
    return 0;
}`
  },
  {
    id: 'matrix-2d',
    name: '2D Matrix Transpose',
    category: '2D Arrays',
    complexity: 'O(n²)',
    description: 'Traverses and modifies a 2D matrix grid with row and column indices',
    code: `#include <stdio.h>

int main() {
    int m[2][2] = {{1, 2}, {3, 4}};
    int temp = m[0][1];
    m[0][1] = m[1][0];
    m[1][0] = temp;

    printf("Transposed: %d %d\\n", m[0][1], m[1][0]);
    return 0;
}`
  },
  {
    id: 'scanf-array',
    name: 'Input Array (scanf)',
    category: 'Input & Loops',
    complexity: 'O(n)',
    description: 'Reads dynamic elements from standard input using scanf() into an array and finds the maximum',
    input: "5\n12 45 7 23 9",
    code: `#include <stdio.h>

int main() {
    int n;
    int arr[10];
    
    // Read count of numbers
    scanf("%d", &n);
    
    // Read elements into array
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }
    
    // Find maximum element
    int max = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    
    printf("Read %d elements. Maximum is %d\\n", n, max);
    return 0;
}`
  },
  {
    id: 'stack-operations',
    name: 'Stack: Push & Pop (LIFO)',
    category: 'Data Structures',
    complexity: 'O(1)',
    description: 'Implements a LIFO stack with push and pop operations, top pointer animation, and vertical beaker chamber',
    code: `#include <stdio.h>

int stack[5];
int top = -1;

void push(int val) {
    if (top < 4) {
        top++;
        stack[top] = val;
    }
}

int pop() {
    if (top >= 0) {
        int val = stack[top];
        top--;
        return val;
    }
    return -1;
}

int main() {
    push(10);
    push(25);
    push(42);
    
    int popped = pop();
    printf("Popped element: %d, current top: %d\\n", popped, top);
    return 0;
}`
  },
  {
    id: 'queue-operations',
    name: 'Queue: Enqueue & Dequeue (FIFO)',
    category: 'Data Structures',
    complexity: 'O(1)',
    description: 'Implements a FIFO queue with front and rear pointer markers and animated conveyor belt flow',
    code: `#include <stdio.h>

int queue[5];
int front = 0;
int rear = -1;

void enqueue(int val) {
    if (rear < 4) {
        rear++;
        queue[rear] = val;
    }
}

int dequeue() {
    if (front <= rear) {
        int val = queue[front];
        front++;
        return val;
    }
    return -1;
}

int main() {
    enqueue(100);
    enqueue(200);
    enqueue(300);
    
    int item = dequeue();
    printf("Dequeued: %d, front is now: %d\\n", item, front);
    return 0;
}`
  },
  {
    id: 'graph-bfs-queue',
    name: 'Graph: BFS Traversal + Queue',
    category: 'Compound Topics (Graph + Queue)',
    complexity: 'O(V + E)',
    description: 'Breadth-First Search on a graph combining Graph adjacency traversal and FIFO Queue synchronization',
    code: `#include <stdio.h>

int visited[5] = {0};
int q[10];
int front = 0;
int rear = -1;

void enqueue(int node) {
    rear++;
    q[rear] = node;
}

int dequeue() {
    int node = q[front];
    front++;
    return node;
}

int main() {
    // Start BFS from node 0 (A)
    visited[0] = 1;
    enqueue(0);

    while (front <= rear) {
        int u = dequeue();
        printf("Visited node: %d\\n", u);

        // Explore simulated neighbor
        int v = u + 1;
        if (v < 5 && !visited[v]) {
            visited[v] = 1;
            enqueue(v);
        }
    }

    return 0;
}`
  },
  {
    id: 'tree-bst-traversal',
    name: 'Tree: BST Search & Inorder',
    category: 'Compound Topics (Tree + Recursion)',
    complexity: 'O(log n)',
    description: 'Binary Search Tree search and traversal with top-down comparison path and sequence chips',
    code: `#include <stdio.h>

struct TreeNode {
    int val;
    int left;
    int right;
};

int main() {
    struct TreeNode root = {20, 10, 30};
    int target = 25;
    int curr = root.val;

    if (target > curr) {
        curr = root.right;
    } else {
        curr = root.left;
    }

    printf("Search target %d, current node is: %d\\n", target, curr);
    return 0;
}`
  },
  {
    id: 'dp-fibonacci',
    name: 'DP: Fibonacci Table & Recurrence',
    category: 'Dynamic Programming',
    complexity: 'O(n)',
    description: 'Bottom-up Dynamic Programming table with flowing SVG dependency curves from subproblems',
    code: `#include <stdio.h>

int dp[7];

int main() {
    int n = 6;
    dp[0] = 0;
    dp[1] = 1;

    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
        printf("dp[%d] = %d\\n", i, dp[i]);
    }

    printf("Fibonacci(%d) is %d\\n", n, dp[n]);
    return 0;
}`
  },
  {
    id: 'bitwise-operations',
    name: 'Bitwise: AND, OR & Masks',
    category: 'Bit Manipulation',
    complexity: 'O(1)',
    description: 'Bitwise operations with 3D flip-card toggle registers and binary-decimal alignment',
    code: `#include <stdio.h>

int main() {
    int a = 13; // 1101 in binary
    int b = 11; // 1011 in binary

    int and_res = a & b; // 1001 (9)
    int or_res = a | b;  // 1111 (15)
    int xor_res = a ^ b; // 0110 (6)

    printf("a & b = %d, a | b = %d, a ^ b = %d\\n", and_res, or_res, xor_res);
    return 0;
}`
  }
];
