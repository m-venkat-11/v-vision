/**
 * Backend Test — Runs the "find max" example through the full pipeline
 * and prints the resulting timeline to console.
 */

import { runWithGDB } from './services/gdbRunner.js';
import { buildTimeline } from './services/timelineBuilder.js';

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
    console.log('[1] Running GDB...');
    const result = await runWithGDB(FIND_MAX_CODE);

    if (!result.success) {
      console.error('❌ GDB failed:', result.error);
      process.exit(1);
    }

    console.log(`✅ GDB completed: ${result.steps.length} raw steps captured\n`);

    // Print raw steps
    console.log('--- Raw GDB Steps ---');
    for (const step of result.steps) {
      console.log(`  Step ${step.step}: Line ${step.line} | ${step.sourceLine} | vars: ${JSON.stringify(step.variables)} | arrays: ${JSON.stringify(step.arrays)}`);
    }
    console.log('');

    // Step 2: Build timeline
    console.log('[2] Building timeline...');
    const timeline = buildTimeline(result.steps, result.sourceLines);

    console.log(`✅ Timeline built: ${timeline.length} events\n`);

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
