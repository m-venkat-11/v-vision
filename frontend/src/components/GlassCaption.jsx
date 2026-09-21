import React from 'react';

/**
 * GlassCaption — Reusable Glassmorphic Caption with Semantic Glowing Dot
 * 
 * Supports color dots matching Claude's 5 reference files:
 * - 'blue': active focus / iteration
 * - 'green': resolved / success / memory allocated
 * - 'amber': comparing / hashing / recurrence dependency
 * - 'red': collision / false / memory leak
 * - 'purple': bitwise / mutation / function boundary
 */
export default function GlassCaption({
  text,
  html,
  color = 'blue', // 'blue' | 'green' | 'amber' | 'red' | 'purple'
  className = '',
  style = {}
}) {
  const dotClass = `dot-${color}`;

  return (
    <div className={`rv-caption ${className}`} style={style}>
      <span className={`rv-caption-dot ${dotClass}`} />
      {html ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
}
