import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing timeline playback state.
 * Supports:
 * - Comfortable, configurable speeds (0.25x, 0.5x, 1x, 1.5x, 2x)
 * - Breakpoint management and "run to breakpoint"
 * - Step countdown progress for auto-play
 * - Timeline scrubbing and navigation
 */
export function useTimelinePlayer() {
  const [timeline, setTimelineState] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [stepProgress, setStepProgress] = useState(0); // 0 to 1 progress of current step interval

  const intervalRef = useRef(null);
  const progressAnimRef = useRef(null);
  const stepStartTimeRef = useRef(0);

  const totalSteps = timeline.length;
  const currentEvent = timeline[currentStep] || null;
  const prevEvent = currentStep > 0 ? timeline[currentStep - 1] : null;

  // Base delay between steps in ms at 1x speed.
  // 1800ms gives user ample time to read the active line, inspect highlights, and digest the explanation.
  const baseStepDelay = 1800;
  const stepDelay = Math.max(300, Math.round(baseStepDelay / speed));

  // Animation duration matches the tempo:
  const animationDuration = Math.min(800, Math.max(250, Math.round(550 / Math.sqrt(speed))));

  const clearAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (progressAnimRef.current) {
      cancelAnimationFrame(progressAnimRef.current);
      progressAnimRef.current = null;
    }
    setStepProgress(0);
  }, []);

  const goToStep = useCallback((step) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
    setStepProgress(0);
  }, [totalSteps]);

  const next = useCallback(() => {
    setCurrentStep(prev => {
      const nextStep = Math.min(prev + 1, totalSteps - 1);
      if (nextStep === totalSteps - 1) {
        setIsPlaying(false);
        clearAutoPlay();
      }
      return nextStep;
    });
    setStepProgress(0);
  }, [totalSteps, clearAutoPlay]);

  const previous = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setStepProgress(0);
  }, []);

  const jumpToStart = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    clearAutoPlay();
  }, [clearAutoPlay]);

  const jumpToEnd = useCallback(() => {
    if (totalSteps > 0) {
      setCurrentStep(totalSteps - 1);
      setIsPlaying(false);
      clearAutoPlay();
    }
  }, [totalSteps, clearAutoPlay]);

  const play = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  }, [currentStep, totalSteps]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearAutoPlay();
  }, [clearAutoPlay]);

  const replay = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    clearAutoPlay();
  }, [clearAutoPlay]);

  const setSpeed = useCallback((newSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  const setTimeline = useCallback((newTimeline) => {
    setTimelineState(newTimeline);
    setCurrentStep(0);
    setIsPlaying(false);
    clearAutoPlay();
  }, [clearAutoPlay]);

  const toggleBreakpoint = useCallback((lineNumber) => {
    setBreakpoints(prev => {
      const nextSet = new Set(prev);
      if (nextSet.has(lineNumber)) {
        nextSet.delete(lineNumber);
      } else {
        nextSet.add(lineNumber);
      }
      return nextSet;
    });
  }, []);

  const clearBreakpoints = useCallback(() => {
    setBreakpoints(new Set());
  }, []);

  // Run to next breakpoint
  const runToBreakpoint = useCallback(() => {
    if (totalSteps === 0 || breakpoints.size === 0) {
      play();
      return;
    }

    // Find next step that matches any breakpoint line
    let targetStep = -1;
    for (let i = currentStep + 1; i < totalSteps; i++) {
      if (breakpoints.has(timeline[i]?.line)) {
        targetStep = i;
        break;
      }
    }

    if (targetStep !== -1) {
      setIsPlaying(true);
    } else {
      play();
    }
  }, [totalSteps, breakpoints, currentStep, timeline, play]);

  // Auto-advance loop & step progress animation
  useEffect(() => {
    clearAutoPlay();

    if (isPlaying && totalSteps > 0) {
      stepStartTimeRef.current = performance.now();

      const updateProgress = () => {
        const elapsed = performance.now() - stepStartTimeRef.current;
        const p = Math.min(1, elapsed / stepDelay);
        setStepProgress(p);
        if (p < 1 && isPlaying) {
          progressAnimRef.current = requestAnimationFrame(updateProgress);
        }
      };

      progressAnimRef.current = requestAnimationFrame(updateProgress);

      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = prev + 1;
          if (nextStep >= totalSteps) {
            setIsPlaying(false);
            clearAutoPlay();
            return prev;
          }

          // Check if nextStep hits a breakpoint
          const nextEvent = timeline[nextStep];
          if (nextEvent && breakpoints.has(nextEvent.line)) {
            setIsPlaying(false);
            clearAutoPlay();
            return nextStep;
          }

          stepStartTimeRef.current = performance.now();
          if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
          progressAnimRef.current = requestAnimationFrame(updateProgress);

          return nextStep;
        });
      }, stepDelay);
    }

    return clearAutoPlay;
  }, [isPlaying, stepDelay, totalSteps, clearAutoPlay, timeline, breakpoints]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (totalSteps === 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (!isPlaying) next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!isPlaying) previous();
          break;
        case ' ':
          e.preventDefault();
          if (isPlaying) pause();
          else play();
          break;
        case 'Home':
          e.preventDefault();
          jumpToStart();
          break;
        case 'End':
          e.preventDefault();
          jumpToEnd();
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            replay();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, isPlaying, next, previous, play, pause, replay, jumpToStart, jumpToEnd]);

  return {
    // State
    timeline,
    currentStep,
    currentEvent,
    prevEvent,
    totalSteps,
    isPlaying,
    speed,
    animationDuration,
    stepDelay,
    stepProgress,
    breakpoints,

    // Actions
    next,
    previous,
    play,
    pause,
    replay,
    jumpToStart,
    jumpToEnd,
    setSpeed,
    setTimeline,
    goToStep,
    toggleBreakpoint,
    clearBreakpoints,
    runToBreakpoint
  };
}
