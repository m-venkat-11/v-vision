import { useState } from 'react';
import { Search, Sparkles, ArrowRight, BookOpen, Code2 } from 'lucide-react';

const SUGGESTIONS = [
  'Reverse an array',
  'Find second largest element',
  'Check if number is prime',
  'Binary search',
  'Two sum'
];

/**
 * QuestionInput — Algorithmic problem query panel
 * Allows typing problem statements or clicking preset suggestion chips,
 * and handles CTA hand-off to Code Mode with starter code.
 */
export default function QuestionInput({
  onSubmitQuestion,
  isLoading,
  currentProblemData,
  onTryCode
}) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmitQuestion(query.trim());
  };

  const handleSelectChip = (chip) => {
    setQuery(chip);
    onSubmitQuestion(chip);
  };

  return (
    <div className="question-input-panel">
      <div className="question-panel-header">
        <div className="panel-title">
          <Sparkles size={14} className="panel-icon" style={{ color: 'var(--color-focus, #38bdf8)' }} />
          <span>Problem Reasoning & Step-by-Step Visualizer</span>
        </div>
        <span className="question-subtitle">
          Describe an algorithm or coding problem in plain English to see its conceptual execution.
        </span>
      </div>

      <form className="question-search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="problem-text-input"
            placeholder="e.g. Reverse an array in-place, find prime numbers, binary search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary problem-submit-btn"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner-sm"></span>
                <span>Generating Solution...</span>
              </>
            ) : (
              <>
                <span>Solve & Visualize</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggestion Chips */}
      <div className="suggestion-chips-row">
        <span className="chips-label">Popular problems:</span>
        <div className="chips-list">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`suggestion-chip ${query.toLowerCase() === s.toLowerCase() ? 'active' : ''}`}
              onClick={() => handleSelectChip(s)}
              disabled={isLoading}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Current Problem Overview & CTA hand-off */}
      {currentProblemData && (
        <div className="problem-meta-card">
          <div className="problem-meta-top">
            <div className="problem-heading-group">
              <h3 className="problem-title">{currentProblemData.title}</h3>
              <div className="problem-badges">
                {currentProblemData.timeComplexity && (
                  <span className="complexity-badge time">⏱ Time: {currentProblemData.timeComplexity}</span>
                )}
                {currentProblemData.spaceComplexity && (
                  <span className="complexity-badge space">💾 Space: {currentProblemData.spaceComplexity}</span>
                )}
              </div>
            </div>

            {currentProblemData.starterCode && onTryCode && (
              <button
                className="btn btn-primary try-code-btn"
                onClick={() => onTryCode(currentProblemData.starterCode)}
                title="Load this solution into the C Code Editor to edit and re-run"
              >
                <Code2 size={14} />
                <span>Now try writing the code</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <p className="problem-approach-text">{currentProblemData.approach}</p>
        </div>
      )}
    </div>
  );
}
