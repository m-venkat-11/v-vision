import { useState } from 'react';
import { 
  SkipBack, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  ChevronsLeft, 
  ChevronsRight, 
  CircleDot, 
  Gauge,
  Sliders
} from 'lucide-react';

export default function PlaybackControls({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  stepDelay,
  stepProgress = 0,
  breakpoints = new Set(),
  onNext,
  onPrevious,
  onPlay,
  onPause,
  onReplay,
  onJumpToStart,
  onJumpToEnd,
  onSetSpeed,
  onGoToStep,
  onRunToBreakpoint,
}) {
  const [showSpeedSlider, setShowSpeedSlider] = useState(false);

  if (totalSteps === 0) return null;

  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;
  const isAtEnd = currentStep >= totalSteps - 1;
  const isAtStart = currentStep <= 0;
  const delaySec = (stepDelay / 1000).toFixed(1);

  return (
    <div className="playback-controls-wrapper">
      {/* Interactive Timeline Scrubber */}
      <div className="timeline-scrubber-track">
        <input
          type="range"
          min="0"
          max={totalSteps - 1}
          value={currentStep}
          onChange={(e) => onGoToStep(parseInt(e.target.value, 10))}
          className="scrubber-slider"
          title={`Scrub execution step (Step ${currentStep + 1} of ${totalSteps})`}
        />
        <div 
          className="scrubber-fill"
          style={{ width: `${progress}%` }}
        />
        {/* Step Countdown Bar for Auto-play */}
        {isPlaying && (
          <div 
            className="step-countdown-bar"
            style={{ 
              left: `${progress}%`,
              width: `${(1 / (totalSteps || 1)) * 100 * stepProgress}%` 
            }}
          />
        )}
      </div>

      <div className="playback-controls-bar">
        {/* Left: Navigation transport */}
        <div className="playback-transport-group">
          <button
            className="transport-btn"
            onClick={onJumpToStart}
            disabled={isAtStart}
            title="First step (Home)"
          >
            <ChevronsLeft size={16} />
          </button>

          <button
            className="transport-btn"
            onClick={onPrevious}
            disabled={isAtStart}
            title="Previous step (←)"
          >
            <SkipBack size={15} />
          </button>

          <button
            className={`transport-btn play-master-btn ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? 'Pause (Space)' : 'Play continuous (Space)'}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            className="transport-btn"
            onClick={onNext}
            disabled={isAtEnd}
            title="Next step (→)"
          >
            <SkipForward size={15} />
          </button>

          <button
            className="transport-btn"
            onClick={onJumpToEnd}
            disabled={isAtEnd}
            title="Last step (End)"
          >
            <ChevronsRight size={16} />
          </button>

          <button
            className="transport-btn icon-subtle"
            onClick={onReplay}
            title="Restart from beginning (R)"
          >
            <RotateCcw size={14} />
          </button>

          {breakpoints && breakpoints.size > 0 && (
            <button
              className="transport-btn breakpoint-run-btn"
              onClick={onRunToBreakpoint}
              title="Continue to next breakpoint"
            >
              <CircleDot size={13} />
              <span>To Breakpoint</span>
            </button>
          )}
        </div>

        {/* Center: Step Indicator */}
        <div className="playback-center-info">
          <div className="step-readout">
            <span className="step-cur">Step {currentStep + 1}</span>
            <span className="step-sep">/</span>
            <span className="step-tot">{totalSteps}</span>
          </div>
          <div className="step-tempo-label">
            {isPlaying ? (
              <span className="tempo-active">
                <span className="tempo-pulse"></span>
                Auto-playing ({delaySec}s / step)
              </span>
            ) : (
              <span className="tempo-paused">Manual Mode (Paused)</span>
            )}
          </div>
        </div>

        {/* Right: Speed controls */}
        <div className="playback-speed-group">
          <div className="speed-pills-wrap">
            {[0.25, 0.5, 1, 1.5, 2].map(s => (
              <button
                key={s}
                className={`speed-pill ${speed === s ? 'active' : ''}`}
                onClick={() => onSetSpeed(s)}
                title={`Set speed to ${s}x`}
              >
                {s}×
              </button>
            ))}
          </div>

          <button
            className={`slider-toggle-btn ${showSpeedSlider ? 'active' : ''}`}
            onClick={() => setShowSpeedSlider(v => !v)}
            title="Toggle fine speed slider"
          >
            <Sliders size={13} />
          </button>

          {showSpeedSlider && (
            <div className="fine-speed-popover">
              <span className="slider-hint">Speed: {speed}× ({delaySec}s)</span>
              <input
                type="range"
                min="0.25"
                max="2.5"
                step="0.25"
                value={speed}
                onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
                className="fine-slider"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
