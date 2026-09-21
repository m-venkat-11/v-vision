import React from 'react';

/**
 * GlassBox — Reusable Glassmorphism Container / Card
 * 
 * Supports reference states:
 * - 'neutral': Standard glass card with 15% white border
 * - 'compare': Amber glow + scanpulse infinite animation
 * - 'true': Green glow ring
 * - 'false': Red glow ring
 * - 'new': Green glow + elastic bounceIn
 * - 'changed': Purple glow + elastic bounceIn
 */
export default function GlassBox({
  children,
  state = 'neutral', // 'neutral' | 'compare' | 'true' | 'false' | 'new' | 'changed'
  className = '',
  style = {},
  onClick,
  title,
  sub,
  icon: Icon,
}) {
  let stateClass = '';
  if (state === 'compare') stateClass = 'rv-box-compare';
  else if (state === 'true') stateClass = 'rv-box-true';
  else if (state === 'false') stateClass = 'rv-box-false';
  else if (state === 'new') stateClass = 'rv-var-box-new';
  else if (state === 'changed') stateClass = 'rv-var-box-changed';

  return (
    <div
      className={`rv-glass-card ${stateClass} ${className}`}
      style={style}
      onClick={onClick}
    >
      {(title || Icon || sub) && (
        <div className="rv-card-header">
          {Icon && <Icon size={14} className="text-cyan" />}
          {title && <span className="rv-card-title">{title}</span>}
          {sub && <span className="rv-card-sub">{sub}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
