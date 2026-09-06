import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

export default function VariableView({ variables, changes, newVariables, animationDuration }) {
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
        <AnimatePresence mode="popLayout">
          {displayVars.map(([name, value]) => {
            const change = changes?.find(c => c.name === name);
            const isNew = newVariables?.includes(name);
            const isChanged = !!change;

            let numericDiff = null;
            if (change && typeof change.from === 'number' && typeof change.to === 'number') {
              numericDiff = change.to - change.from;
            }

            return (
              <motion.div
                key={name}
                className={`var-card ${isChanged ? 'is-changed' : ''} ${isNew ? 'is-new' : ''}`}
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: animationDuration / 1100 }}
                layout
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
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={`${name}-${value}`}
                        className="var-value-text"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: animationDuration / 1400 }}
                      >
                        {typeof value === 'number' ? value : String(value)}
                      </motion.span>
                    </AnimatePresence>

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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
