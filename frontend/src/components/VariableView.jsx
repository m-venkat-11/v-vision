import { Cpu, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * VariableView — Ground-up rewrite based on Reference 1, Section 1
 *
 * Visualizes scalar runtime stack variables for ANY arbitrary C program:
 * - Dynamic type deduction (int, float, char, char*, bool, ptr)
 * - Clean number and string formatting
 * - New variables: .rv-var-box-new (green glow + bounceIn)
 * - Changed variables: .rv-var-box-changed (purple glow + bounceIn) with diff pill and prev value crumb
 * - Unchanged variables: neutral glass card
 */

function detectVarType(val, name) {
  if (typeof val === 'boolean') return 'bool';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return 'int';
    return 'float';
  }
  if (typeof val === 'string') {
    if (val.length === 1 || /^'.*'$/.test(val)) return 'char';
    if (/^0x[0-9a-fA-F]+$/i.test(val)) return 'ptr';
    return 'char*';
  }
  if (typeof val === 'object' && val !== null) {
    if (Array.isArray(val)) return 'array';
    return 'struct';
  }
  return 'var';
}

function formatVarValue(val) {
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) {
      return Number(val.toFixed(4)).toString();
    }
    return val.toString();
  }
  if (typeof val === 'string') {
    if (val.length === 1 && !/^'.*'$/.test(val)) {
      return `'${val}'`;
    }
    return val;
  }
  return String(val);
}

export default function VariableView({ variables, changes, newVariables }) {
  if (!variables || Object.keys(variables).length === 0) return null;

  const displayVars = Object.entries(variables).filter(([name]) =>
    !['argc', 'argv', '__func__'].includes(name)
  );
  if (displayVars.length === 0) return null;

  return (
    <div className="rv-vars-section">
      {/* Section header */}
      <div className="rv-section-label">
        <Cpu size={13} />
        <span>Stack Variables</span>
        <span className="rv-count-pill">{displayVars.length}</span>
      </div>

      {/* Variable grid */}
      <div className="rv-var-grid">
        {displayVars.map(([name, value]) => {
          const change = changes?.find(c => c.name === name);
          const isNew = newVariables?.includes(name);
          const isChgd = !!change && !isNew;
          const varType = detectVarType(value, name);

          // Numeric diff calculation
          let diff = null;
          if (change && typeof change.from === 'number' && typeof change.to === 'number') {
            diff = change.to - change.from;
          }

          let boxState = 'neutral';
          if (isNew) boxState = 'new';
          if (isChgd) boxState = 'changed';

          return (
            <div key={name} className={`rv-var-box rv-var-box-${boxState}`}>
              {/* Type + name header */}
              <div className="rv-var-box-header rv-var-header">
                <span className="rv-var-type">{varType}</span>
                <span className="rv-var-name">{name}</span>
                {isNew && (
                  <span className="rv-var-pill-new rv-var-badge rv-badge-new">
                    <Sparkles size={9} /> init
                  </span>
                )}
                {isChgd && (
                  <span className="rv-var-pill-chg rv-var-badge rv-badge-chg">
                    ↑ changed
                  </span>
                )}
              </div>

              {/* Value row */}
              <div className="rv-var-val-row rv-var-value-row">
                <span className="rv-var-val rv-var-value">
                  {formatVarValue(value)}
                </span>

                {/* Diff pill */}
                {diff !== null && (
                  <span className={`rv-var-pill-diff rv-diff-pill ${diff >= 0 ? 'rv-diff-pos diff-pos' : 'rv-diff-neg diff-neg'}`}>
                    {diff >= 0
                      ? <><TrendingUp size={10} /> +{diff}</>
                      : <><TrendingDown size={10} /> {diff}</>
                    }
                  </span>
                )}
              </div>

              {/* Previous value crumb */}
              {isChgd && change && (
                <div className="rv-var-prev rv-var-crumb">
                  <span className="crumb-from">{formatVarValue(change.from)}</span>
                  <span className="crumb-arrow">→</span>
                  <span className="crumb-to">{formatVarValue(change.to)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
