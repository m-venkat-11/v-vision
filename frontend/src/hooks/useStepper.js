import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useStepper — Reusable hook implementing the exact stepper state machine
 * from Claude's reference files:
 *   function mk(steps, render, cEl) {
 *     let i = 0; ... next(), prev(), reset()
 *   }
 * 
 * Supports:
 * - step index, total steps
 * - next(), prev(), reset(), goTo(index)
 * - auto-play with customizable interval and auto-stop at end
 */
export function useStepper(totalSteps = 1, initialStep = 0, autoPlayInterval = null) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const next = useCallback(() => {
    setCurrentStep(s => Math.min(s + 1, Math.max(totalSteps - 1, 0)));
  }, [totalSteps]);

  const prev = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const goTo = useCallback((idx) => {
    setCurrentStep(Math.max(0, Math.min(idx, totalSteps - 1)));
  }, [totalSteps]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  // Auto-play interval effect
  useEffect(() => {
    if (!isPlaying || !autoPlayInterval) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentStep(s => {
        if (s >= totalSteps - 1) {
          setIsPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalSteps, autoPlayInterval]);

  return {
    currentStep,
    totalSteps,
    isFirst: currentStep === 0,
    isLast: currentStep >= totalSteps - 1,
    next,
    prev,
    reset,
    goTo,
    play,
    pause,
    togglePlay,
    isPlaying
  };
}

export default useStepper;
