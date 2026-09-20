import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Binary, Cpu, RotateCw } from 'lucide-react';

/**
 * BitVisualizer
 * 
 * Visualizes bit manipulation operations (AND, OR, XOR, shifts, masks).
 * Inspired by Claude Glass Bit Manipulation & Systems visualizers.
 * Features:
 * - 3D flip-card toggle animation for individual bits
 * - Synchronized operand rows and evaluated result row
 * - Simultaneous Binary (base-2) and Decimal (base-10) display
 */
export default function BitVisualizer({
  bitData,
  event,
  variables = {},
  animationDuration = 0.4
}) {
  const { operandA, operandB, op, result, bitLength, activeBitIdx, caption, title } = useMemo(() => {
    // 1. Direct custom bitData
    if (bitData) {
      return {
        operandA: bitData.operandA ?? 13,
        operandB: bitData.operandB ?? 11,
        op: bitData.op ?? '&',
        result: bitData.result ?? 9,
        bitLength: bitData.bitLength ?? 4,
        activeBitIdx: bitData.activeBitIdx ?? 2,
        caption: bitData.caption ?? '',
        title: bitData.title ?? 'Bitwise Operations'
      };
    }

    // 2. Extract from variables and sourceLine
    const aVal = variables?.a ?? variables?.x ?? variables?.num1 ?? 13;
    const bVal = variables?.b ?? variables?.y ?? variables?.num2 ?? 11;
    let operation = '&';

    if (event?.sourceLine) {
      const line = event.sourceLine;
      if (line.includes('&')) operation = '&';
      else if (line.includes('|')) operation = '|';
      else if (line.includes('^')) operation = '^';
      else if (line.includes('<<')) operation = '<<';
      else if (line.includes('>>')) operation = '>>';
    }

    let res = 0;
    if (operation === '&') res = aVal & bVal;
    else if (operation === '|') res = aVal | bVal;
    else if (operation === '^') res = aVal ^ bVal;
    else if (operation === '<<') res = aVal << (bVal & 7);
    else if (operation === '>>') res = aVal >> (bVal & 7);

    // Active bit from loop variable or index e.g. i
    const currBit = variables?.i !== undefined && variables.i < 8 ? variables.i : 1;

    return {
      operandA: aVal,
      operandB: bVal,
      op: operation,
      result: res,
      bitLength: 4,
      activeBitIdx: currBit,
      caption: `Computing: ${aVal} ${operation} ${bVal} = ${res} (Bit ${currBit} verified).`,
      title: `Bitwise ${operation === '&' ? 'AND (&)' : operation === '|' ? 'OR (|)' : 'XOR (^)'}`
    };
  }, [bitData, variables, event]);

  // Convert numbers to fixed-length binary string arrays
  const toBits = (num, len) => {
    return (num >>> 0).toString(2).padStart(len, '0').slice(-len).split('');
  };

  const bitsA = toBits(operandA, bitLength);
  const bitsB = toBits(operandB, bitLength);
  const bitsRes = toBits(result, bitLength);

  return (
    <div className="glass-visualizer-card bit-glass-card">
      <div className="glass-card-header">
        <div className="header-badge">
          <Binary size={13} className="text-purple" />
          <span>{title}</span>
        </div>
        <span className="glass-subtext">3D Flip-Card Bit Registers</span>
      </div>

      <div className="bit-registers-table">
        {/* Row A */}
        <div className="bit-register-row">
          <div className="bit-row-label">
            <span className="var-name">a</span>
            <span className="dec-val">({operandA})</span>
          </div>
          <div className="bit-cells-group">
            {bitsA.map((bit, idx) => (
              <div
                key={`a-${idx}`}
                className={`bit-card ${idx === activeBitIdx ? 'bit-card-highlight amber-pulse' : ''}`}
              >
                <span>{bit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operator Badge & Row B */}
        <div className="bit-register-row">
          <div className="bit-row-label">
            <span className="var-name">b</span>
            <span className="dec-val">({operandB})</span>
            <span className="op-tag">{op}</span>
          </div>
          <div className="bit-cells-group">
            {bitsB.map((bit, idx) => (
              <div
                key={`b-${idx}`}
                className={`bit-card ${idx === activeBitIdx ? 'bit-card-highlight amber-pulse' : ''}`}
              >
                <span>{bit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bit-divider-line" />

        {/* Result Row with 3D Flip */}
        <div className="bit-register-row result-bit-row">
          <div className="bit-row-label">
            <span className="var-name">res</span>
            <span className="dec-val green-text">({result})</span>
          </div>
          <div className="bit-cells-group">
            {bitsRes.map((bit, idx) => {
              const isFlipping = idx === activeBitIdx;
              return (
                <motion.div
                  key={`res-${idx}-${bit}`}
                  className={`bit-card result-bit-card ${bit === '1' ? 'bit-one-active' : 'bit-zero'}`}
                  initial={isFlipping ? { rotateY: 90 } : false}
                  animate={{ rotateY: 0 }}
                  transition={{ duration: animationDuration, type: 'spring' }}
                >
                  <span>{bit}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Synchronized Caption */}
      {caption && (
        <div className="glass-caption-bar">
          <span className="caption-dot purple-dot" />
          <span className="caption-text">{caption}</span>
        </div>
      )}
    </div>
  );
}
