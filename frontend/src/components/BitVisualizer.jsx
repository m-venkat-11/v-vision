import { useMemo } from 'react';
import { Binary } from 'lucide-react';

/**
 * BitVisualizer — Ground-up rewrite based on Reference 2, Section 2
 *
 * Exact patterns from reference:
 *   .bit default:  42×42px, 12px radius, rgba(255,255,255,.06), 1.5px white/15% border
 *   .bit.amber:    amber glow ring (operands being compared)
 *   .bit.green:    green glow ring (result bits that are 1)
 *   .bit.flip:     @keyframes flip3d — rotateY(0) → rotateY(90deg) → rotateY(0) 0.45s
 *   .bit.ghost:    opacity 0.2 (bits not yet evaluated)
 *
 * Row layout: [label 64px] [bit cells row]
 * 3 rows: operandA, operandB (with op label), result
 * Result bits flip in one-by-one with flip3d as they are computed.
 */
export default function BitVisualizer({ bitData, event, variables = {} }) {
  const { operandA, operandB, op, result, bitLen, activeBitIdx, caption, title } = useMemo(() => {
    if (bitData) {
      return {
        operandA:    bitData.operandA    ?? 13,
        operandB:    bitData.operandB    ?? 11,
        op:          bitData.op          ?? '&',
        result:      bitData.result      ?? 9,
        bitLen:      bitData.bitLength   ?? 4,
        activeBitIdx: bitData.activeBitIdx ?? -1,
        caption:     bitData.caption     ?? '',
        title:       bitData.title       ?? 'Bitwise Operations'
      };
    }

    const aVal = variables?.a ?? variables?.x ?? variables?.num1 ?? 13;
    const bVal = variables?.b ?? variables?.y ?? variables?.num2 ?? 11;
    let operation = '&';
    if (event?.sourceLine) {
      const l = event.sourceLine;
      if (l.includes('<<')) operation = '<<';
      else if (l.includes('>>')) operation = '>>';
      else if (l.includes('^')) operation = '^';
      else if (l.includes('|')) operation = '|';
      else if (l.includes('&')) operation = '&';
    }

    let res = 0;
    if      (operation === '&')  res = aVal & bVal;
    else if (operation === '|')  res = aVal | bVal;
    else if (operation === '^')  res = aVal ^ bVal;
    else if (operation === '<<') res = aVal << (bVal & 7);
    else if (operation === '>>') res = aVal >> (bVal & 7);

    const currBit = typeof variables?.i === 'number' && variables.i < 8 ? variables.i : -1;

    return {
      operandA:    aVal,
      operandB:    bVal,
      op:          operation,
      result:      res,
      bitLen:      4,
      activeBitIdx: currBit,
      caption:     `Computing: ${aVal} ${operation} ${bVal} = ${res}`,
      title:       `Bitwise ${operation === '&' ? 'AND' : operation === '|' ? 'OR' : operation === '^' ? 'XOR' : operation}`
    };
  }, [bitData, variables, event]);

  const toBits = (n, len) =>
    (n >>> 0).toString(2).padStart(len, '0').slice(-len).split('');

  const bitsA   = toBits(operandA, bitLen);
  const bitsB   = toBits(operandB, bitLen);
  const bitsRes = toBits(result,   bitLen);

  return (
    <div className="rv-bit-card">
      {/* Header */}
      <div className="rv-card-header">
        <Binary size={13} className="rv-icon-purple" />
        <span className="rv-card-title">{title}</span>
        <span className="rv-card-sub">3D flip-card bit registers</span>
      </div>

      {/* Row A — operand */}
      <div className="rv-bitrow">
        <span className="rv-bit-lbl">a = {operandA}</span>
        {bitsA.map((b, i) => (
          <div
            key={`a${i}`}
            className={`rv-bit ${i === activeBitIdx ? 'rv-bit-amber' : ''}`}
          >
            {b}
          </div>
        ))}
      </div>

      {/* Row B — operand with operator */}
      <div className="rv-bitrow">
        <span className="rv-bit-lbl">b = {operandB} <span className="rv-op-badge">{op}</span></span>
        {bitsB.map((b, i) => (
          <div
            key={`b${i}`}
            className={`rv-bit ${i === activeBitIdx ? 'rv-bit-amber' : ''}`}
          >
            {b}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="rv-bit-divider" />

      {/* Result row — bits flip in with flip3d */}
      <div className="rv-bitrow">
        <span className="rv-bit-lbl">result <span className="rv-dec-small">({result})</span></span>
        {bitsRes.map((b, i) => {
          const isFlip   = i === activeBitIdx;
          const isActive = b === '1' && (activeBitIdx < 0 || i <= activeBitIdx);
          const isGhost  = activeBitIdx >= 0 && i > activeBitIdx;
          let cls = 'rv-bit';
          if (isFlip)   cls += ' rv-bit-flip';
          if (isActive && !isFlip) cls += ' rv-bit-green';
          if (isGhost)  cls += ' rv-bit-ghost';
          return (
            <div key={`r${i}`} className={cls}>{isGhost ? '·' : b}</div>
          );
        })}
      </div>

      {/* Caption */}
      {caption && (
        <div className="rv-caption">
          <span className="rv-caption-dot dot-purple" />
          <span dangerouslySetInnerHTML={{ __html: caption }} />
        </div>
      )}
    </div>
  );
}
