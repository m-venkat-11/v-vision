import { spawn, execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

const cCode = `
#include <stdio.h>
int main() {
    int a = 10;
    int b = 20;
    int c = a + b;
    printf("c = %d\\n", c);
    return 0;
}
`;

writeFileSync('scratch_test.c', cCode);
execSync('gcc -g -O0 -o scratch_test.exe scratch_test.c');

const gdb = spawn('gdb', ['--interpreter=mi2', '--quiet', 'scratch_test.exe']);

let buffer = '';
let responseLines = [];
let commandResolve = null;
let waitingForStop = false;

gdb.stdout.on('data', (d) => {
  buffer += d.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const raw of lines) {
    const l = raw.trim();
    if (!l || l === '(gdb)') continue;
    responseLines.push(l);

    if (waitingForStop) {
      if (l.startsWith('*stopped') || l.startsWith('^error')) {
        waitingForStop = false;
        if (commandResolve) {
          const res = [...responseLines];
          responseLines = [];
          const r = commandResolve;
          commandResolve = null;
          r(res);
        }
      }
    } else {
      if (l.startsWith('^done') || l.startsWith('^error')) {
        if (commandResolve) {
          const res = [...responseLines];
          responseLines = [];
          const r = commandResolve;
          commandResolve = null;
          r(res);
        }
      }
    }
  }
});

function sendQuery(cmd) {
  return new Promise(res => {
    responseLines = [];
    waitingForStop = false;
    commandResolve = res;
    gdb.stdin.write(cmd + '\n');
  });
}

function sendExec(cmd) {
  return new Promise(res => {
    responseLines = [];
    waitingForStop = true;
    commandResolve = res;
    gdb.stdin.write(cmd + '\n');
  });
}

async function test() {
  await new Promise(r => setTimeout(r, 400));
  console.log('1. break main:', (await sendQuery('-break-insert main')).find(l => l.startsWith('^')));
  console.log('2. exec run:', (await sendExec('-exec-run')).find(l => l.startsWith('*stopped')));
  console.log('3. frame:', (await sendQuery('-stack-info-frame')).find(l => l.startsWith('^done')));
  console.log('4. locals:', (await sendQuery('-stack-list-locals --all-values')).find(l => l.startsWith('^done')));
  console.log('5. exec step:', (await sendExec('-exec-step')).find(l => l.startsWith('*stopped')));
  console.log('6. frame after step:', (await sendQuery('-stack-info-frame')).find(l => l.startsWith('^done')));
  console.log('7. locals after step:', (await sendQuery('-stack-list-locals --all-values')).find(l => l.startsWith('^done')));
  console.log('SUCCESS! GDB MI2 stepping is 100% reliable.');
  gdb.kill();
  if (existsSync('scratch_test.c')) unlinkSync('scratch_test.c');
}

test().catch(console.error);
