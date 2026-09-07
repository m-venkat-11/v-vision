import express from 'express';

export const explainProblemRoute = express.Router();

/**
 * Built-in deterministic problem library for instant offline reasoning and timelines
 */
const BUILTIN_PROBLEMS = {
  'reverse an array': {
    title: 'Reverse an Array In-Place',
    approach: 'Use two pointers (left at 0, right at n-1). Repeatedly swap arr[left] and arr[right] and move inward until left >= right.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    starterCode: `#include <stdio.h>

void reverseArray(int arr[], int n) {
    int left = 0;
    int right = n - 1;
    while (left < right) {
        int temp = arr[left];
        arr[left] = arr[right];
        arr[right] = temp;
        left++;
        right--;
    }
}

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int n = 5;
    reverseArray(arr, n);
    return 0;
}`,
    timeline: [
      {
        step: 0,
        line: 16,
        sourceLine: 'int arr[] = {10, 20, 30, 40, 50};',
        eventType: 'ARRAY_CHANGED',
        arrays: { arr: [10, 20, 30, 40, 50] },
        variables: { n: 5 },
        highlight: { arr: { indices: [0, 1, 2, 3, 4], role: 'focus' } },
        why: 'Initialize array with 5 elements: [10, 20, 30, 40, 50].'
      },
      {
        step: 1,
        line: 4,
        sourceLine: 'int left = 0;',
        eventType: 'VARIABLE_CREATED',
        arrays: { arr: [10, 20, 30, 40, 50] },
        variables: { left: 0, right: 4, n: 5 },
        highlight: { arr: { indices: [0], role: 'focus' } },
        why: 'Left pointer initialized to index 0 (arr[0] = 10).'
      },
      {
        step: 2,
        line: 5,
        sourceLine: 'int right = n - 1;',
        eventType: 'VARIABLE_CREATED',
        arrays: { arr: [10, 20, 30, 40, 50] },
        variables: { left: 0, right: 4, n: 5 },
        highlight: { arr: { indices: [0, 4], role: 'compare' } },
        why: 'Right pointer initialized to index 4 (arr[4] = 50).'
      },
      {
        step: 3,
        line: 6,
        sourceLine: 'while (left < right)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [10, 20, 30, 40, 50] },
        variables: { left: 0, right: 4 },
        conditionResult: true,
        highlight: { arr: { indices: [0, 4], role: 'compare' } },
        why: 'Condition left < right (0 < 4) is TRUE. Entering loop to swap ends.'
      },
      {
        step: 4,
        line: 7,
        sourceLine: 'int temp = arr[left]; arr[left] = arr[right]; arr[right] = temp;',
        eventType: 'ARRAY_CHANGED',
        arrays: { arr: [50, 20, 30, 40, 10] },
        variables: { left: 0, right: 4, temp: 10 },
        highlight: { arr: { indices: [0, 4], role: 'write' } },
        why: 'Swapped arr[0] (10) and arr[4] (50). Array is now [50, 20, 30, 40, 10].'
      },
      {
        step: 5,
        line: 10,
        sourceLine: 'left++; right--;',
        eventType: 'VARIABLE_CHANGED',
        arrays: { arr: [50, 20, 30, 40, 10] },
        variables: { left: 1, right: 3 },
        highlight: { arr: { indices: [1, 3], role: 'focus' } },
        why: 'Moved left to 1 and right to 3 inward towards center.'
      },
      {
        step: 6,
        line: 6,
        sourceLine: 'while (left < right)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [50, 20, 30, 40, 10] },
        variables: { left: 1, right: 3 },
        conditionResult: true,
        highlight: { arr: { indices: [1, 3], role: 'compare' } },
        why: 'Condition left < right (1 < 3) is TRUE. Proceeding to swap.'
      },
      {
        step: 7,
        line: 7,
        sourceLine: 'int temp = arr[left]; arr[left] = arr[right]; arr[right] = temp;',
        eventType: 'ARRAY_CHANGED',
        arrays: { arr: [50, 40, 30, 20, 10] },
        variables: { left: 1, right: 3, temp: 20 },
        highlight: { arr: { indices: [1, 3], role: 'write' } },
        why: 'Swapped arr[1] (20) and arr[3] (40). Array is now [50, 40, 30, 20, 10].'
      },
      {
        step: 8,
        line: 10,
        sourceLine: 'left++; right--;',
        eventType: 'VARIABLE_CHANGED',
        arrays: { arr: [50, 40, 30, 20, 10] },
        variables: { left: 2, right: 2 },
        highlight: { arr: { indices: [2], role: 'focus' } },
        why: 'Moved left to 2 and right to 2. Pointers meet at middle element (30).'
      },
      {
        step: 9,
        line: 6,
        sourceLine: 'while (left < right)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [50, 40, 30, 20, 10] },
        variables: { left: 2, right: 2 },
        conditionResult: false,
        highlight: { arr: { indices: [2], role: 'compare' } },
        why: 'Condition left < right (2 < 2) is FALSE. Reversal complete!'
      },
      {
        step: 10,
        line: 20,
        sourceLine: 'return 0;',
        eventType: 'PROGRAM_END',
        arrays: { arr: [50, 40, 30, 20, 10] },
        variables: { left: 2, right: 2 },
        highlight: { arr: { indices: [0, 1, 2, 3, 4], role: 'focus' } },
        why: 'Program finished. Fully reversed array: [50, 40, 30, 20, 10].'
      }
    ]
  },
  'find second largest element': {
    title: 'Find Second Largest Element in Array',
    approach: 'Single pass tracking the maximum (first) and the second maximum. Update second when a number is between second and first, or update both when a new maximum is found.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    starterCode: `#include <stdio.h>

int findSecondLargest(int arr[], int n) {
    int first = -1, second = -1;
    for (int i = 0; i < n; i++) {
        if (arr[i] > first) {
            second = first;
            first = arr[i];
        } else if (arr[i] > second && arr[i] != first) {
            second = arr[i];
        }
    }
    return second;
}

int main() {
    int arr[] = {12, 35, 1, 10, 34, 1};
    int res = findSecondLargest(arr, 6);
    return 0;
}`,
    timeline: [
      {
        step: 0,
        line: 16,
        sourceLine: 'int arr[] = {12, 35, 1, 10, 34, 1};',
        eventType: 'ARRAY_CHANGED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { first: -1, second: -1, i: 0 },
        highlight: { arr: { indices: [0], role: 'focus' } },
        why: 'Initialize array [12, 35, 1, 10, 34, 1]. first = -1, second = -1.'
      },
      {
        step: 1,
        line: 6,
        sourceLine: 'if (arr[i] > first)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { i: 0, first: 12, second: -1 },
        highlight: { arr: { indices: [0], role: 'compare' } },
        why: 'arr[0]=12 > first (-1). Update second=-1, first=12.'
      },
      {
        step: 2,
        line: 6,
        sourceLine: 'if (arr[i] > first)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { i: 1, first: 35, second: 12 },
        highlight: { arr: { indices: [1], role: 'compare' } },
        why: 'arr[1]=35 > first (12). Previous first becomes second (12), new first is 35.'
      },
      {
        step: 3,
        line: 9,
        sourceLine: 'else if (arr[i] > second && arr[i] != first)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { i: 2, first: 35, second: 12 },
        highlight: { arr: { indices: [2], role: 'compare' } },
        why: 'arr[2]=1 is not greater than first (35) or second (12). No changes.'
      },
      {
        step: 4,
        line: 9,
        sourceLine: 'else if (arr[i] > second && arr[i] != first)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { i: 3, first: 35, second: 12 },
        highlight: { arr: { indices: [3], role: 'compare' } },
        why: 'arr[3]=10 is not greater than second (12). No changes.'
      },
      {
        step: 5,
        line: 9,
        sourceLine: 'else if (arr[i] > second && arr[i] != first)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { i: 4, first: 35, second: 34 },
        highlight: { arr: { indices: [4], role: 'write' } },
        why: 'arr[4]=34 is > second (12) and != first (35). Update second = 34!'
      },
      {
        step: 6,
        line: 9,
        sourceLine: 'else if (arr[i] > second && arr[i] != first)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { i: 5, first: 35, second: 34 },
        highlight: { arr: { indices: [5], role: 'compare' } },
        why: 'arr[5]=1 is less than second (34). Loop concludes.'
      },
      {
        step: 7,
        line: 18,
        sourceLine: 'return 0;',
        eventType: 'PROGRAM_END',
        arrays: { arr: [12, 35, 1, 10, 34, 1] },
        variables: { first: 35, second: 34, res: 34 },
        highlight: { arr: { indices: [4], role: 'focus' } },
        why: 'Scan complete! Second largest element identified: 34 (first largest is 35).'
      }
    ]
  },
  'check if number is prime': {
    title: 'Primality Testing via Trial Division',
    approach: 'If n <= 1, it is not prime. Check divisibility from i = 2 up to i * i <= n. If any divisor evenly divides n, it is composite.',
    timeComplexity: 'O(√n)',
    spaceComplexity: 'O(1)',
    starterCode: `#include <stdio.h>
#include <stdbool.h>

bool isPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int num = 29;
    bool result = isPrime(num);
    return 0;
}`,
    timeline: [
      {
        step: 0,
        line: 12,
        sourceLine: 'int num = 29;',
        eventType: 'VARIABLE_CREATED',
        variables: { num: 29 },
        why: 'Testing if number 29 is a prime number.'
      },
      {
        step: 1,
        line: 5,
        sourceLine: 'if (n <= 1) return false;',
        eventType: 'CONDITION_CHECKED',
        variables: { n: 29 },
        conditionResult: false,
        why: '29 > 1, so proceed to test divisors.'
      },
      {
        step: 2,
        line: 6,
        sourceLine: 'for (int i = 2; i * i <= n; i++)',
        eventType: 'LOOP_STARTED',
        variables: { n: 29, i: 2, 'i*i': 4 },
        why: 'Starting trial divisor search at i = 2 (2 * 2 = 4 <= 29).'
      },
      {
        step: 3,
        line: 7,
        sourceLine: 'if (n % i == 0)',
        eventType: 'CONDITION_CHECKED',
        variables: { n: 29, i: 2, rem: 1 },
        conditionResult: false,
        why: '29 % 2 = 1 != 0. 29 is not divisible by 2.'
      },
      {
        step: 4,
        line: 6,
        sourceLine: 'i++ (i = 3)',
        eventType: 'LOOP_ITERATION',
        variables: { n: 29, i: 3, 'i*i': 9 },
        why: 'Increment to i = 3 (3 * 3 = 9 <= 29).'
      },
      {
        step: 5,
        line: 7,
        sourceLine: 'if (n % i == 0)',
        eventType: 'CONDITION_CHECKED',
        variables: { n: 29, i: 3, rem: 2 },
        conditionResult: false,
        why: '29 % 3 = 2 != 0. 29 is not divisible by 3.'
      },
      {
        step: 6,
        line: 6,
        sourceLine: 'i++ (i = 4)',
        eventType: 'LOOP_ITERATION',
        variables: { n: 29, i: 4, 'i*i': 16 },
        why: 'Increment to i = 4 (4 * 4 = 16 <= 29).'
      },
      {
        step: 7,
        line: 7,
        sourceLine: 'if (n % i == 0)',
        eventType: 'CONDITION_CHECKED',
        variables: { n: 29, i: 4, rem: 1 },
        conditionResult: false,
        why: '29 % 4 = 1 != 0. 29 is not divisible by 4.'
      },
      {
        step: 8,
        line: 6,
        sourceLine: 'i++ (i = 5)',
        eventType: 'LOOP_ITERATION',
        variables: { n: 29, i: 5, 'i*i': 25 },
        why: 'Increment to i = 5 (5 * 5 = 25 <= 29).'
      },
      {
        step: 9,
        line: 7,
        sourceLine: 'if (n % i == 0)',
        eventType: 'CONDITION_CHECKED',
        variables: { n: 29, i: 5, rem: 4 },
        conditionResult: false,
        why: '29 % 5 = 4 != 0. 29 is not divisible by 5.'
      },
      {
        step: 10,
        line: 6,
        sourceLine: 'i++ (i = 6, 6*6 = 36 > 29)',
        eventType: 'LOOP_ENDED',
        variables: { n: 29, i: 6, 'i*i': 36 },
        why: '6 * 6 = 36 > 29. No divisor <= √29 exists. Loop terminates.'
      },
      {
        step: 11,
        line: 9,
        sourceLine: 'return true;',
        eventType: 'PROGRAM_END',
        variables: { num: 29, result: true },
        why: '29 has no divisors other than 1 and itself. 29 is PRIME!'
      }
    ]
  },
  'binary search': {
    title: 'Binary Search on Sorted Array',
    approach: 'Maintain low and high pointers. Compute mid = low + (high - low)/2. If target matches arr[mid], return mid. If target is smaller, search left half; otherwise search right half.',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    starterCode: `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int arr[] = {2, 5, 8, 12, 16, 23, 38, 56};
    int target = 23;
    int index = binarySearch(arr, 8, target);
    return 0;
}`,
    timeline: [
      {
        step: 0,
        line: 14,
        sourceLine: 'int arr[] = {2, 5, 8, 12, 16, 23, 38, 56}; int target = 23;',
        eventType: 'ARRAY_CHANGED',
        arrays: { arr: [2, 5, 8, 12, 16, 23, 38, 56] },
        variables: { target: 23, low: 0, high: 7 },
        highlight: { arr: { indices: [0, 7], role: 'focus' } },
        why: 'Initialized sorted array of 8 elements. Searching for target value 23.'
      },
      {
        step: 1,
        line: 6,
        sourceLine: 'int mid = low + (high - low) / 2; // mid = 3',
        eventType: 'VARIABLE_CREATED',
        arrays: { arr: [2, 5, 8, 12, 16, 23, 38, 56] },
        variables: { low: 0, high: 7, mid: 3, val: 12, target: 23 },
        highlight: { arr: { indices: [3], role: 'compare' } },
        why: 'Computed mid index = 3. arr[3] = 12. 12 < 23, discard left half.'
      },
      {
        step: 2,
        line: 8,
        sourceLine: 'low = mid + 1; // low = 4',
        eventType: 'VARIABLE_CHANGED',
        arrays: { arr: [2, 5, 8, 12, 16, 23, 38, 56] },
        variables: { low: 4, high: 7, target: 23 },
        highlight: { arr: { indices: [4, 5, 6, 7], role: 'focus' } },
        why: 'Updated search range to [low=4, high=7].'
      },
      {
        step: 3,
        line: 6,
        sourceLine: 'int mid = low + (high - low) / 2; // mid = 5',
        eventType: 'VARIABLE_CREATED',
        arrays: { arr: [2, 5, 8, 12, 16, 23, 38, 56] },
        variables: { low: 4, high: 7, mid: 5, val: 23, target: 23 },
        highlight: { arr: { indices: [5], role: 'compare' } },
        why: 'Computed mid index = 5. arr[5] = 23.'
      },
      {
        step: 4,
        line: 7,
        sourceLine: 'if (arr[mid] == target) return mid;',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [2, 5, 8, 12, 16, 23, 38, 56] },
        variables: { mid: 5, target: 23 },
        conditionResult: true,
        highlight: { arr: { indices: [5], role: 'write' } },
        why: 'arr[5] == 23 matches target exactly! Target found at index 5 in only 2 comparisons.'
      },
      {
        step: 5,
        line: 17,
        sourceLine: 'return 0;',
        eventType: 'PROGRAM_END',
        arrays: { arr: [2, 5, 8, 12, 16, 23, 38, 56] },
        variables: { index: 5, target: 23 },
        highlight: { arr: { indices: [5], role: 'focus' } },
        why: 'Binary search finished successfully. Found target 23 at index 5.'
      }
    ]
  },
  'two sum': {
    title: 'Two Sum Problem',
    approach: 'Find two numbers in the array whose sum equals a given target. We compare all pairs or use a two-pointer pass on a sorted array.',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    starterCode: `#include <stdio.h>

void twoSum(int arr[], int n, int target) {
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (arr[i] + arr[j] == target) {
                printf("Found: arr[%d] + arr[%d] = %d\\n", i, j, target);
                return;
            }
        }
    }
}

int main() {
    int arr[] = {2, 7, 11, 15};
    twoSum(arr, 4, 9);
    return 0;
}`,
    timeline: [
      {
        step: 0,
        line: 15,
        sourceLine: 'int arr[] = {2, 7, 11, 15};',
        eventType: 'ARRAY_CHANGED',
        arrays: { arr: [2, 7, 11, 15] },
        variables: { target: 9, i: 0 },
        highlight: { arr: { indices: [0], role: 'focus' } },
        why: 'Initialize array [2, 7, 11, 15]. Target sum = 9.'
      },
      {
        step: 1,
        line: 5,
        sourceLine: 'for (int j = i + 1; j < n; j++)',
        eventType: 'LOOP_STARTED',
        arrays: { arr: [2, 7, 11, 15] },
        variables: { i: 0, j: 1, sum: 9, target: 9 },
        highlight: { arr: { indices: [0, 1], role: 'compare' } },
        why: 'Evaluating pair arr[0] (2) + arr[1] (7) = 9.'
      },
      {
        step: 2,
        line: 6,
        sourceLine: 'if (arr[i] + arr[j] == target)',
        eventType: 'CONDITION_CHECKED',
        arrays: { arr: [2, 7, 11, 15] },
        variables: { i: 0, j: 1, sum: 9, target: 9 },
        conditionResult: true,
        highlight: { arr: { indices: [0, 1], role: 'write' } },
        why: 'Pair found! arr[0] (2) + arr[1] (7) == 9 matches target!'
      },
      {
        step: 3,
        line: 17,
        sourceLine: 'return 0;',
        eventType: 'PROGRAM_END',
        arrays: { arr: [2, 7, 11, 15] },
        variables: { pair_i: 0, pair_j: 1, target: 9 },
        highlight: { arr: { indices: [0, 1], role: 'focus' } },
        why: 'Target sum 9 achieved with indices [0, 1].'
      }
    ]
  }
};

/**
 * Normalizes query string for matching
 */
function findMatchingPreset(problem) {
  const norm = problem.toLowerCase().trim();
  for (const [key, val] of Object.entries(BUILTIN_PROBLEMS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return val;
    }
  }
  // Keyword-based fallback matches
  if (norm.includes('reverse') || norm.includes('invert')) return BUILTIN_PROBLEMS['reverse an array'];
  if (norm.includes('second') || norm.includes('2nd')) return BUILTIN_PROBLEMS['find second largest element'];
  if (norm.includes('prime')) return BUILTIN_PROBLEMS['check if number is prime'];
  if (norm.includes('binary') || norm.includes('bsearch')) return BUILTIN_PROBLEMS['binary search'];
  if (norm.includes('two sum') || norm.includes('sum pair')) return BUILTIN_PROBLEMS['two sum'];

  return null;
}

/**
 * Call Gemini for arbitrary coding questions
 */
async function callGeminiForProblem(problem, apiKey) {
  const prompt = `You are an algorithmic visualization engine for C programming.
The user wants to visually understand this problem: "${problem}".

Provide a comprehensive, high-quality step-by-step reasoning plan and runnable C code.
Respond ONLY with valid JSON matching this schema, no markdown fence:
{
  "title": "Problem Title",
  "approach": "Clear 2-sentence explanation of the algorithmic approach.",
  "timeComplexity": "Big-O time complexity (e.g. O(n), O(log n))",
  "spaceComplexity": "Big-O space complexity (e.g. O(1), O(n))",
  "starterCode": "Complete, valid, clean C code that solves the problem with a main() function.",
  "timeline": [
    {
      "step": 0,
      "line": 1,
      "sourceLine": "Code line string",
      "eventType": "VARIABLE_CREATED" or "ARRAY_CHANGED" or "CONDITION_CHECKED" or "LOOP_STARTED" or "PROGRAM_END",
      "variables": { "x": 1 },
      "arrays": { "arr": [1, 2, 3] },
      "highlight": { "arr": { "indices": [0], "role": "focus" } },
      "why": "Clear explanation of what is happening at this step."
    }
  ]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    })
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  return { ...parsed, source: 'gemini' };
}

explainProblemRoute.post('/explain-problem', async (req, res) => {
  try {
    const { problem } = req.body;
    if (!problem || typeof problem !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing problem query' });
    }

    // 1. Check built-in preset library
    const preset = findMatchingPreset(problem);
    if (preset) {
      return res.json({ success: true, ...preset, source: 'builtin' });
    }

    // 2. Try Gemini if configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const geminiResult = await callGeminiForProblem(problem, apiKey);
        return res.json({ success: true, ...geminiResult });
      } catch (err) {
        console.warn('Gemini problem explanation failed, using fallback:', err.message);
      }
    }

    // 3. Graceful generic fallback
    const fallback = BUILTIN_PROBLEMS['reverse an array'];
    return res.json({
      success: true,
      title: `Problem: ${problem}`,
      approach: `We break down "${problem}" into incremental operations, demonstrating array manipulation and pointer logic.`,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      starterCode: fallback.starterCode,
      timeline: fallback.timeline,
      source: 'fallback'
    });
  } catch (err) {
    console.error('Error in /api/explain-problem:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate problem explanation',
      details: err.message
    });
  }
});
