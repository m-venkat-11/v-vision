import { motion } from 'motion/react';
import { Cpu, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

export default function VariableView({ variables, changes, newVariables, animationDuration = 400 }) {
  if (!variables || Object.keys(variables).length === 0) return null;

  const displayVars = Object.entries(variables).filter(([name]) => {
    return !['argc', 'argv'].includes(name);
  });

  if (displayVars.length === 0) return null;

  return (
    <div className="variables-section">
      <div className="section-subtitle">
        <Cpu size={14} className="section-icon" />
        <span>Stack Variables & Registers</span>
        <span className="count-tag">{displayVars.length} active</span>
      </div>

      <div className="variable-cards-grid">
        {displayVars.map(([name, value]) => {
          const change = changes?.find(c => c.name === name);
          const isNew = newVariables?.includes(name);
          const isChanged = !!change;

          let numericDiff = null;
          if (change && typeof change.from === 'number' && typeof change.to === 'number') {
            numericDiff = change.to - change.from;
          }

          return (
            <div
              key={name}
              className={`var-card ${isChanged ? 'is-changed' : ''} ${isNew ? 'is-new' : ''}`}
            >
              <div className="var-header">
                <span className="var-type">int</span>
                <span className="var-name">{name}</span>
                {isNew && (
                  <span className="var-status-badge new">
                    <Sparkles size={10} /> init
                  </span>
                )}
                {isChanged && (
                  <span className="var-status-badge changed">
                    updated
                  </span>
                )}
              </div>

              <div className="var-body">
                <div className="var-value-display">
                  <span className="var-value-text">
                    {typeof value === 'number' ? value : String(value)}
                  </span>

                  {numericDiff !== null && (
                    <span className={`diff-pill ${numericDiff >= 0 ? 'positive' : 'negative'}`}>
                      {numericDiff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {numericDiff >= 0 ? `+${numericDiff}` : numericDiff}
                    </span>
                  )}
                </div>

                {isChanged && change && (
                  <div className="var-history-crumb">
                    <span className="crumb-from">{change.from}</span>
                    <span className="crumb-arrow">→</span>
                    <span className="crumb-to">{change.to}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
