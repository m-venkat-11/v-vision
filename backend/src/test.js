/**
 * Backend Test — Runs the "find max" example through the full pipeline
 * and prints the resulting timeline to console.
 */

import { runAndTrace } from './services/gdbRunner.js';

const FIND_MAX_CODE = `#include <stdio.h>
int main() {
    int a[] = {4, 8, 2, 9, 1};
    int n = 5;
    int max = a[0];
    int i;
    for(i = 1; i < n; i++) {
        if(a[i] > max) {
            max = a[i];
        }
    }
    printf("Max: %d\\n", max);
    return 0;
}`;

async function test() {
  console.log('=== VisualCode Backend Test ===\n');
  console.log('Testing with: Find Maximum in Array\n');

  try {
    // Step 1: Run GDB
    console.log('[1] Running GDB & Pipeline...');
    const result = await runAndTrace(FIND_MAX_CODE);

    if (!result.success) {
      console.error('❌ Pipeline failed:', result.error);
      process.exit(1);
    }

    const timeline = result.timeline || [];
    console.log(`✅ Pipeline completed: ${timeline.length} events generated\n`);

    // Print timeline
    console.log('--- Clean Timeline ---');
    for (const event of timeline) {
      console.log(`  Step ${event.step}: [${event.eventType}] Line ${event.line}`);
      console.log(`    Source: ${event.sourceLine}`);
      console.log(`    Why: ${event.why}`);
      if (event.highlight && event.highlight.indices) {
        console.log(`    Highlight: ${event.highlight.array}[${event.highlight.indices.join(',')}]`);
      }
      if (event.conditionResult !== undefined) {
        console.log(`    Condition: ${event.conditionResult ? '✅ True' : '❌ False'}`);
      }
      if (event.changes) {
        console.log(`    Changes: ${event.changes.map(c => `${c.name}: ${c.from} → ${c.to}`).join(', ')}`);
      }
      console.log('');
    }

    console.log('=== Test Complete ===');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

test();
