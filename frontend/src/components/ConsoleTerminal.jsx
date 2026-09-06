import { useMemo } from 'react';
import { Terminal, CheckCircle2 } from 'lucide-react';

/**
 * Reconstruct stdout stream from timeline steps up to currentStep
 */
export function extractStdout(timeline, currentStep) {
  if (!timeline || timeline.length === 0) return [];
  const lines = [];

  for (let i = 0; i <= currentStep && i < timeline.length; i++) {
    const ev = timeline[i];
    const src = ev?.sourceLine || '';

    // Check for printf call
    const printfMatch = src.match(/printf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]+))?\s*\)/);
    if (printfMatch) {
      let formatStr = printfMatch[1];
      const argsRaw = printfMatch[2];

      if (argsRaw && ev.variables) {
        const argNames = argsRaw.split(',').map(s => s.trim());
        const argValues = argNames.map(arg => {
          if (ev.variables[arg] !== undefined) return ev.variables[arg];
          // Try literal or expression
          return arg;
        });

        // Replace %d, %i, %s, etc.
        let argIdx = 0;
        formatStr = formatStr.replace(/%[difsugx]/g, () => {
          const val = argValues[argIdx++];
          return val !== undefined ? val : '?';
        });
      }

      // Unescape \n
      const rendered = formatStr.replace(/\\n/g, '\n').replace(/\\t/g, '    ');
      lines.push({
        step: i,
        text: rendered,
        isLatest: i === currentStep
      });
    }
  }

  return lines;
}

export default function ConsoleTerminal({ timeline, currentStep }) {
  const outputLines = useMemo(() => {
    return extractStdout(timeline, currentStep);
  }, [timeline, currentStep]);

  return (
    <div className="terminal-pane">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
        </div>
        <div className="terminal-title">
          <Terminal size={12} />
          <span>stdout & standard I/O stream</span>
        </div>
        <div className="terminal-badge">gcc -O0 output</div>
      </div>

      <div className="terminal-screen">
        <div className="term-line prompt-line">
          <span className="term-prompt">$</span>
          <span className="term-command">./program</span>
        </div>

        {outputLines.length === 0 ? (
          <div className="term-empty">
            <span className="term-dim">Waiting for standard output (printf statements will appear here)...</span>
          </div>
        ) : (
          outputLines.map((line, idx) => (
            <div 
              key={idx} 
              className={`term-output-line ${line.isLatest ? 'term-latest-pulse' : ''}`}
            >
              <span className="term-text">{line.text}</span>
              {line.isLatest && <span className="term-step-tag">Step {line.step + 1}</span>}
            </div>
          ))
        )}

        <div className="term-cursor-row">
          <span className="term-prompt">$</span>
          <span className="term-cursor"></span>
        </div>
      </div>
    </div>
  );
}
