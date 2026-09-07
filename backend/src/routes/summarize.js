import express from 'express';
import crypto from 'crypto';

export const summarizeRoute = express.Router();

// In-memory cache
const summaryCache = new Map();

/**
 * Heuristic code analyzer when Gemini API is unavailable or offline
 */
function analyzeCodeHeuristically(code) {
  const normalized = code.toLowerCase();

  // Pattern detection
  const hasNestedLoops = /(for|while)[\s\S]*?(for|while)/.test(code);
  const hasRecursion = /(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/.test(code);
  const hasMalloc = /malloc|calloc/.test(code);
  const hasBinarySearch = /mid\s*=|left\s*<=\s*right|low\s*<=\s*high/i.test(code);
  const hasSwap = /temp\s*=\s*\w+\[|swap/i.test(code);
  const hasMatrix = /\w+\[[^\]]+\]\[[^\]]+\]/.test(code);
  const hasLinkedList = /struct\s+\w+\s*\{[\s\S]*?struct\s+\w+\s*\*\s*next/i.test(code);
  const hasFibonacci = /fib|fibonacci/i.test(code);
  const hasFactorial = /fact|factorial/i.test(code);
  const hasPrime = /prime|sqrt|%\s*i/i.test(code);
  const hasPalindrome = /palin|rev|strlen/i.test(code);

  let title = 'C Program';
  let summary = 'This program executes a series of sequential computations and state transitions.';
  let timeComplexity = 'O(n)';
  let spaceComplexity = 'O(1)';
  let keyTechnique = 'Iterative control flow';

  if (hasLinkedList) {
    title = 'Singly Linked List Operations';
    summary = 'Dynamically allocates self-referential nodes linked via pointers, performing node creation, forward traversal, and pointer updates.';
    timeComplexity = 'O(n)';
    spaceComplexity = 'O(n) on heap';
    keyTechnique = 'Pointer linking & dynamic heap allocation';
  } else if (hasBinarySearch) {
    title = 'Binary Search Algorithm';
    summary = 'Repeatedly divides a sorted search interval in half by comparing the target element with the middle element, reducing the search space exponentially.';
    timeComplexity = 'O(log n)';
    spaceComplexity = 'O(1)';
    keyTechnique = 'Divide-and-conquer search';
  } else if (hasSwap && hasNestedLoops) {
    if (normalized.includes('bubble') || normalized.includes('swapped')) {
      title = 'Bubble Sort';
      summary = 'Iteratively compares and swaps adjacent out-of-order elements, allowing larger values to "bubble up" to the end of the array.';
      timeComplexity = 'O(n²)';
      spaceComplexity = 'O(1)';
      keyTechnique = 'Adjacent element comparison & swapping';
    } else if (normalized.includes('selection') || normalized.includes('min_idx') || normalized.includes('minidx')) {
      title = 'Selection Sort';
      summary = 'Finds the minimum element from the unsorted segment in each pass and swaps it into its correct sorted position.';
      timeComplexity = 'O(n²)';
      spaceComplexity = 'O(1)';
      keyTechnique = 'Minimum index selection';
    } else {
      title = 'Quadratic Sorting Algorithm';
      summary = 'Sorts elements in-place using nested comparison passes over the array.';
      timeComplexity = 'O(n²)';
      spaceComplexity = 'O(1)';
      keyTechnique = 'In-place array reordering';
    }
  } else if (hasFibonacci && hasRecursion) {
    title = 'Recursive Fibonacci';
    summary = 'Computes the nth Fibonacci number by recursively calling fib(n-1) + fib(n-2) down to the base cases n <= 1.';
    timeComplexity = 'O(2ⁿ)';
    spaceComplexity = 'O(n) call stack';
    keyTechnique = 'Tree recursion & base case evaluation';
  } else if (hasFactorial && hasRecursion) {
    title = 'Recursive Factorial';
    summary = 'Computes n! by multiplying n by the factorial of (n-1) until reaching the base case n <= 1.';
    timeComplexity = 'O(n)';
    spaceComplexity = 'O(n) call stack';
    keyTechnique = 'Linear recursion';
  } else if (hasMatrix) {
    title = '2D Matrix Processing';
    summary = 'Iterates across a two-dimensional grid row-by-row and column-by-column using nested coordinate loops.';
    timeComplexity = 'O(rows × cols)';
    spaceComplexity = 'O(1)';
    keyTechnique = 'Nested 2D array traversal';
  } else if (hasPrime) {
    title = 'Primality Test';
    summary = 'Checks if a given number has any integer divisors other than 1 and itself by testing divisibility.';
    timeComplexity = 'O(√n)';
    spaceComplexity = 'O(1)';
    keyTechnique = 'Trial division';
  } else if (hasPalindrome) {
    title = 'String Reversal / Palindrome Check';
    summary = 'Compares or swaps characters from opposite ends of a string moving inwards towards the center.';
    timeComplexity = 'O(n)';
    spaceComplexity = 'O(1)';
    keyTechnique = 'Two-pointer inward scanning';
  } else if (hasMalloc) {
    title = 'Dynamic Heap Allocation';
    summary = 'Allocates contiguous memory blocks at runtime using malloc/calloc and accesses them via pointer offsets.';
    timeComplexity = 'O(n)';
    spaceComplexity = 'O(n) on heap';
    keyTechnique = 'Dynamic memory management';
  } else if (hasNestedLoops) {
    title = 'Nested Loop Algorithm';
    summary = 'Executes multi-pass algorithmic steps with an outer loop controlling stages and inner loop processing elements.';
    timeComplexity = 'O(n²)';
    spaceComplexity = 'O(1)';
    keyTechnique = 'Nested iterative passes';
  }

  return {
    title,
    summary,
    timeComplexity,
    spaceComplexity,
    keyTechnique,
    source: 'heuristic'
  };
}

/**
 * Calls Gemini if GEMINI_API_KEY is present
 */
async function callGemini(code, apiKey) {
  const prompt = `Analyze this C code and provide a concise, high-quality technical summary in strict JSON format.

C Code:
\`\`\`c
${code.slice(0, 3000)}
\`\`\`

Respond ONLY with valid JSON matching this schema, no markdown code fence:
{
  "title": "Short title (e.g. Bubble Sort, Singly Linked List)",
  "summary": "2 to 3 concise, clear sentences explaining what this code does and how it works conceptually.",
  "timeComplexity": "Big-O time complexity (e.g. O(n²), O(n log n), O(log n), O(n))",
  "spaceComplexity": "Big-O auxiliary space (e.g. O(1), O(n))",
  "keyTechnique": "Key algorithmic technique (e.g. Divide-and-conquer, In-place swapping, Two-pointer)"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  return {
    ...parsed,
    source: 'gemini'
  };
}

summarizeRoute.post('/summarize', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing code in request body' });
    }

    const trimmed = code.trim();
    const hash = crypto.createHash('sha256').update(trimmed).digest('hex');

    // Check cache
    if (summaryCache.has(hash)) {
      return res.json({ success: true, ...summaryCache.get(hash), cached: true });
    }

    let result;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        result = await callGemini(trimmed, apiKey);
      } catch (geminiErr) {
        console.warn('Gemini summary failed, falling back to heuristic:', geminiErr.message);
        result = analyzeCodeHeuristically(trimmed);
      }
    } else {
      result = analyzeCodeHeuristically(trimmed);
    }

    // Cache result
    summaryCache.set(hash, result);
    return res.json({ success: true, ...result, cached: false });
  } catch (err) {
    console.error('Error in /api/summarize:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate code summary',
      details: err.message
    });
  }
});
