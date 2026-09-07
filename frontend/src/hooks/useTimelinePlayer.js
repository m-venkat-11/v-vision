import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing timeline playback state.
 * Tuned for zero-flicker, rock-solid stepping performance.
 */
export function useTimelinePlayer() {
  const [timeline, setTimelineState] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [breakpoints, setBreakpoints] = useState(new Set());

  const intervalRef = useRef(null);

  const totalSteps = timeline.length;
  const currentEvent = timeline[currentStep] || null;
  const prevEvent = currentStep > 0 ? timeline[currentStep - 1] : null;

  // Base delay between steps in ms at 1x speed.
  const baseStepDelay = 1600;
  const stepDelay = Math.max(350, Math.round(baseStepDelay / speed));

  // Animation duration matches the tempo
  const animationDuration = Math.min(600, Math.max(200, Math.round(450 / Math.sqrt(speed))));

  const clearAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const goToStep = useCallback((step) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
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
  }, [totalSteps, clearAutoPlay]);

  const previous = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
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
    clearAutoPlay();
    setIsPlaying(false);
    setTimelineState(newTimeline || []);
    setCurrentStep(0);
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

  // Clean auto-advance timer: ONLY triggers a React render ONCE per step interval!
  useEffect(() => {
    clearAutoPlay();

    if (isPlaying && totalSteps > 0) {
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

          return nextStep;
        });
      }, stepDelay);
    }

    return clearAutoPlay;
  }, [isPlaying, stepDelay, totalSteps, clearAutoPlay, timeline, breakpoints]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.target.closest('.monaco-editor')) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) pause();
          else play();
          break;
        case 'ArrowRight':
          e.preventDefault();
          pause();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          pause();
          previous();
          break;
        case 'Home':
          e.preventDefault();
          jumpToStart();
          break;
        case 'End':
          e.preventDefault();
          jumpToEnd();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, play, pause, next, previous, jumpToStart, jumpToEnd]);

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
    stepProgress: 0,
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
