import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { BarChart3, TrendingUp, ChevronDown, ChevronUp, Layers } from 'lucide-react';

/**
 * ChartsPanel — Recharts-based live metrics & variable trajectory
 * Provides operation counters (comparisons, writes, accesses, calls) and
 * numerical value changes over time, synchronized to current playback step.
 */
export default function ChartsPanel({ timeline = [], currentStep = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeChart, setActiveChart] = useState('operations'); // 'operations' | 'values'

  // Pre-calculate cumulative metrics and variable snapshots across all steps
  const { chartData, trackedVars } = useMemo(() => {
    if (!timeline || timeline.length === 0) {
      return { chartData: [], trackedVars: [] };
    }

    let comparisons = 0;
    let arrayAccesses = 0;
    let writes = 0;
    let functionCalls = 0;

    // Collect all numerical variables that appear and change
    const varNamesSet = new Set();
    timeline.forEach(ev => {
      if (ev.variables) {
        Object.entries(ev.variables).forEach(([k, v]) => {
          if (typeof v === 'number' && !['argc', 'argv'].includes(k)) {
            varNamesSet.add(k);
          }
        });
      }
    });
    const tracked = Array.from(varNamesSet).slice(0, 4); // Limit to top 4 tracked variables

    const data = timeline.map((ev, idx) => {
      if (ev.eventType === 'CONDITION_CHECKED') comparisons++;
      if (ev.eventType === 'ARRAY_ACCESS' || ev.highlight?.arr) arrayAccesses++;
      if (ev.eventType === 'ARRAY_CHANGED' || ev.eventType === 'VARIABLE_CHANGED' || ev.eventType === 'VARIABLE_CREATED') writes++;
      if (ev.eventType === 'FUNCTION_CALLED' || ev.eventType === 'RECURSIVE_CALL') functionCalls++;

      const stepObj = {
        step: idx,
        comparisons,
        arrayAccesses,
        writes,
        functionCalls,
        ...(ev.variables || {})
      };

      return stepObj;
    });

    return { chartData: data, trackedVars: tracked };
  }, [timeline]);

  if (!timeline || timeline.length === 0) return null;

  // Colors for lines and bars
  const colors = {
    comparisons: '#f59e0b', // Amber
    arrayAccesses: '#38bdf8', // Blue
    writes: '#10b981', // Green
    functionCalls: '#a855f7', // Purple
    var0: '#818cf8', // Indigo
    var1: '#ec4899', // Pink
    var2: '#14b8a6', // Teal
    var3: '#f97316', // Orange
  };

  return (
    <div className="charts-panel-container">
      <div className="charts-header" onClick={() => setIsExpanded(e => !e)}>
        <div className="charts-title-group">
          <BarChart3 size={15} className="charts-icon" style={{ color: 'var(--color-focus, #38bdf8)' }} />
          <span className="charts-title">Execution Analytics & Metrics</span>
          <span className="charts-step-indicator">Step {currentStep + 1} of {timeline.length}</span>
        </div>

        <div className="charts-header-actions" onClick={e => e.stopPropagation()}>
          <div className="charts-tab-pills">
            <button
              className={`chart-pill-btn ${activeChart === 'operations' ? 'active' : ''}`}
              onClick={() => setActiveChart('operations')}
            >
              Operations Count
            </button>
            {trackedVars.length > 0 && (
              <button
                className={`chart-pill-btn ${activeChart === 'values' ? 'active' : ''}`}
                onClick={() => setActiveChart('values')}
              >
                Value Over Time
              </button>
            )}
          </div>

          <button
            className="charts-toggle-btn"
            onClick={() => setIsExpanded(e => !e)}
            title={isExpanded ? 'Collapse charts' : 'Expand charts'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="charts-body">
          {activeChart === 'operations' ? (
            <div className="chart-render-area">
              <div className="chart-legend-summary">
                <span className="summary-metric" style={{ color: colors.comparisons }}>
                  ● Comparisons: {chartData[currentStep]?.comparisons ?? 0}
                </span>
                <span className="summary-metric" style={{ color: colors.writes }}>
                  ● Memory Writes: {chartData[currentStep]?.writes ?? 0}
                </span>
                <span className="summary-metric" style={{ color: colors.arrayAccesses }}>
                  ● Array Reads: {chartData[currentStep]?.arrayAccesses ?? 0}
                </span>
                <span className="summary-metric" style={{ color: colors.functionCalls }}>
                  ● Function Calls: {chartData[currentStep]?.functionCalls ?? 0}
                </span>
              </div>

              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="step"
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={val => `S${val}`}
                    />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(13, 15, 26, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f8fafc',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <ReferenceLine x={currentStep} stroke="#6366f1" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="comparisons"
                      stroke={colors.comparisons}
                      strokeWidth={2}
                      dot={false}
                      name="Comparisons"
                    />
                    <Line
                      type="monotone"
                      dataKey="writes"
                      stroke={colors.writes}
                      strokeWidth={2}
                      dot={false}
                      name="Memory Writes"
                    />
                    <Line
                      type="monotone"
                      dataKey="arrayAccesses"
                      stroke={colors.arrayAccesses}
                      strokeWidth={2}
                      dot={false}
                      name="Array Reads"
                    />
                    <Line
                      type="monotone"
                      dataKey="functionCalls"
                      stroke={colors.functionCalls}
                      strokeWidth={2}
                      dot={false}
                      name="Function Calls"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="chart-render-area">
              <div className="chart-legend-summary">
                {trackedVars.map((vName, idx) => {
                  const valColor = [colors.var0, colors.var1, colors.var2, colors.var3][idx % 4];
                  return (
                    <span key={vName} className="summary-metric" style={{ color: valColor }}>
                      ● {vName}: {chartData[currentStep]?.[vName] ?? '—'}
                    </span>
                  );
                })}
              </div>

              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="step"
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={val => `S${val}`}
                    />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(13, 15, 26, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f8fafc',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <ReferenceLine x={currentStep} stroke="#6366f1" strokeDasharray="3 3" />
                    {trackedVars.map((vName, idx) => {
                      const valColor = [colors.var0, colors.var1, colors.var2, colors.var3][idx % 4];
                      return (
                        <Line
                          key={vName}
                          type="monotone"
                          dataKey={vName}
                          stroke={valColor}
                          strokeWidth={2}
                          dot={false}
                          name={vName}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
