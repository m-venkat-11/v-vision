/**
 * animationConfig.js
 * Shared Framer Motion spring/transition configs — import these everywhere.
 * Never define per-component animation timing; always use from here.
 */

/** Standard spring for pointer arrows, array cell highlights */
export const springStandard = {
  type: 'spring',
  stiffness: 320,
  damping: 28,
  mass: 1,
};

/** Fast spring for snappy state updates (variable boxes, etc.) */
export const springSnappy = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

/** Gentle spring for large element entrance (panels, new heap blocks) */
export const springGentle = {
  type: 'spring',
  stiffness: 180,
  damping: 22,
  mass: 1.2,
};

/** Scale the spring duration proportionally with playback speed.
 *  Call this with `speed` (0.25x, 0.5x, 1x, 1.5x, 2x) to get a tuned config.
 */
export function scaledSpring(speed = 1, base = springStandard) {
  const durationScale = 1 / Math.sqrt(speed);
  return {
    ...base,
    stiffness: base.stiffness * Math.sqrt(speed),
    damping: base.damping * durationScale,
  };
}

/** Phase durations in ms at 1x speed. Scale by 1/speed for other speeds. */
export const PHASE_DURATIONS = {
  highlight: 200,  // Phase 1: highlight the elements involved
  operate:   300,  // Phase 2: show the operation/comparison result
  change:    400,  // Phase 3: animate the resulting state change
  settle:    150,  // Phase 4: settle into the new state
};

export function scaledPhaseDurations(speed = 1) {
  const s = Math.max(0.25, speed);
  return {
    highlight: Math.round(PHASE_DURATIONS.highlight / s),
    operate:   Math.round(PHASE_DURATIONS.operate / s),
    change:    Math.round(PHASE_DURATIONS.change / s),
    settle:    Math.round(PHASE_DURATIONS.settle / s),
  };
}

/** Cell color roles by event phase */
export const CELL_COLORS = {
  highlight: { bg: 'rgba(56,189,248,0.22)',  border: '#38bdf8', text: '#e0f2fe' },  // Blue
  compare:   { bg: 'rgba(245,158,11,0.22)', border: '#f59e0b', text: '#fef3c7' },  // Amber
  changed:   { bg: 'rgba(16,185,129,0.22)', border: '#10b981', text: '#d1fae5' },  // Green
  error:     { bg: 'rgba(239,68,68,0.22)',  border: '#ef4444', text: '#fee2e2' },  // Red
  normal:    { bg: 'rgba(20,23,40,0.9)',    border: 'rgba(255,255,255,0.10)', text: '#f1f5f9' },
};

/** Pointer indicator colors by variable name */
export const POINTER_VAR_COLORS = {
  i:       { bg: 'rgba(99,102,241,0.25)',  border: '#818cf8', text: '#c7d2fe' },
  j:       { bg: 'rgba(245,158,11,0.25)',  border: '#fbbf24', text: '#fde68a' },
  k:       { bg: 'rgba(56,189,248,0.25)',  border: '#38bdf8', text: '#e0f2fe' },
  left:    { bg: 'rgba(6,182,212,0.25)',   border: '#22d3ee', text: '#cffafe' },
  right:   { bg: 'rgba(168,85,247,0.25)',  border: '#c084fc', text: '#f3e8ff' },
  low:     { bg: 'rgba(6,182,212,0.25)',   border: '#22d3ee', text: '#cffafe' },
  high:    { bg: 'rgba(168,85,247,0.25)',  border: '#c084fc', text: '#f3e8ff' },
  mid:     { bg: 'rgba(251,146,60,0.25)',  border: '#fb923c', text: '#fed7aa' },
  max:     { bg: 'rgba(16,185,129,0.25)',  border: '#34d399', text: '#d1fae5' },
  min:     { bg: 'rgba(239,68,68,0.25)',   border: '#f87171', text: '#fee2e2' },
  target:  { bg: 'rgba(236,72,153,0.25)', border: '#f472b6', text: '#fce7f3' },
  default: { bg: 'rgba(148,163,184,0.25)', border: '#94a3b8', text: '#f1f5f9' },
};

export function getPointerColor(name) {
  return POINTER_VAR_COLORS[name] || POINTER_VAR_COLORS.default;
}
