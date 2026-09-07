import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Clock, HardDrive, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_URL = RAW_API_URL.replace(/\/+$/, '').endsWith('/api')
  ? RAW_API_URL.replace(/\/+$/, '')
  : `${RAW_API_URL.replace(/\/+$/, '')}/api`;

// In-browser cache across sessions
const clientSummaryCache = new Map();

/**
 * ExplanationPanel — Algorithm purpose & complexity analysis
 * Elevated summary card with plain-language explanation, Big-O complexities,
 * and key technique badges with client-side caching.
 */
export default function ExplanationPanel({ code, isVisible = true }) {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastFetchedCodeRef = useRef('');

  useEffect(() => {
    if (!code || !code.trim() || !isVisible) return;
    const trimmed = code.trim();

    // Check client-side memory cache
    if (clientSummaryCache.has(trimmed)) {
      setSummaryData(clientSummaryCache.get(trimmed));
      return;
    }

    // Avoid duplicate requests for identical code
    if (lastFetchedCodeRef.current === trimmed) return;
    lastFetchedCodeRef.current = trimmed;

    let isCancelled = false;
    setIsLoading(true);

    fetch(`${API_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed })
    })
      .then(res => res.json())
      .then(data => {
        if (!isCancelled && data.success) {
          const info = {
            title: data.title || 'Algorithm Summary',
            summary: data.summary || 'Analyzes iterative state transitions and algorithmic flow.',
            timeComplexity: data.timeComplexity || 'O(n)',
            spaceComplexity: data.spaceComplexity || 'O(1)',
            keyTechnique: data.keyTechnique || 'Iterative traversal',
            source: data.source || 'heuristic'
          };
          clientSummaryCache.set(trimmed, info);
          setSummaryData(info);
        }
      })
      .catch(err => {
        console.warn('Could not fetch algorithm summary:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [code, isVisible]);

  if (!summaryData && !isLoading) return null;

  return (
    <div className="explanation-panel-card">
      <div className="exp-card-header" onClick={() => setIsCollapsed(c => !c)}>
        <div className="exp-title-group">
          <div className="exp-icon-pill">
            <Sparkles size={14} className="sparkle-icon" />
          </div>
          <div className="exp-title-text">
            <span className="exp-heading">
              {isLoading ? 'Analyzing Code...' : summaryData?.title || 'Algorithm Overview'}
            </span>
            {summaryData?.keyTechnique && !isLoading && (
              <span className="exp-technique-pill">
                <Lightbulb size={11} />
                {summaryData.keyTechnique}
              </span>
            )}
          </div>
        </div>

        <div className="exp-badges-group" onClick={e => e.stopPropagation()}>
          {summaryData?.timeComplexity && !isLoading && (
            <span className="complexity-badge time" title="Time Complexity">
              <Clock size={11} />
              <span>{summaryData.timeComplexity}</span>
            </span>
          )}
          {summaryData?.spaceComplexity && !isLoading && (
            <span className="complexity-badge space" title="Space Complexity">
              <HardDrive size={11} />
              <span>{summaryData.spaceComplexity}</span>
            </span>
          )}
          <button
            className="exp-collapse-btn"
            onClick={() => setIsCollapsed(c => !c)}
            title={isCollapsed ? 'Expand summary' : 'Collapse summary'}
          >
            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="exp-card-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <div className="exp-loading-skeleton">
                <div className="skeleton-line full"></div>
                <div className="skeleton-line part"></div>
              </div>
            ) : (
              <p className="exp-summary-text">{summaryData?.summary}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
