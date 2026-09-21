import { Cpu, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * VariableView — Ground-up rewrite based on Reference 1, Section 1
 *
 * Exact assignment animation from reference:
 *   Step 1: var box in neutral state → .box default
 *   Step 2: RHS expression appears with amber scanpulse → .box.compare
 *   Step 3: Expression collapses to value with green glow → .box.true  
 *   Step 4: Value bounces into var → .box.bounce (bounceIn animation)
 *
 * We show:
 *   - All current variables as glass boxes
 *   - New vars: .rv-box-bounce (bounceIn animation = new assignment)
 *   - Changed vars: .rv-box-changed (purple glow) with diff pill
 *   - Unchanged: .rv-box default neutral glass
 *
 * Color semantics from reference:
 *   New (init):   green glow (.box.true equiv)   
 *   Changed:      purple + bounceIn (.box.bounce equiv with purple instead of neutral)
 *   Unchanged:    neutral glass
 */
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

      {/* Variable grid — each var is a .box from Reference 1 */}
      <div className="rv-var-grid">
        {displayVars.map(([name, value]) => {
          const change  = changes?.find(c => c.name === name);
          const isNew   = newVariables?.includes(name);
          const isChgd  = !!change && !isNew;

          // Numeric diff for arrow pill
          let diff = null;
          if (change && typeof change.from === 'number' && typeof change.to === 'number') {
            diff = change.to - change.from;
          }

          // Map to reference box states
          let boxState = 'neutral';
          if (isNew)  boxState = 'new';      // green glow + bounce
          if (isChgd) boxState = 'changed';  // purple glow + bounce

          return (
            <div key={name} className={`rv-var-box rv-var-box-${boxState}`}>
              {/* Type + name header */}
              <div className="rv-var-header">
                <span className="rv-var-type">int</span>
                <span className="rv-var-name">{name}</span>
                {isNew  && <span className="rv-var-badge rv-badge-new"><Sparkles size={9}/> init</span>}
                {isChgd && <span className="rv-var-badge rv-badge-chg">↑ changed</span>}
              </div>

              {/* Value — large monospace */}
              <div className="rv-var-value-row">
                <span className="rv-var-value">
                  {typeof value === 'number' ? value : String(value)}
                </span>

                {/* Diff pill (from reference concept: show delta) */}
                {diff !== null && (
                  <span className={`rv-diff-pill ${diff >= 0 ? 'diff-pos' : 'diff-neg'}`}>
                    {diff >= 0
                      ? <><TrendingUp size={10}/> +{diff}</>
                      : <><TrendingDown size={10}/> {diff}</>
                    }
                  </span>
                )}
              </div>

              {/* Previous value crumb */}
              {isChgd && change && (
                <div className="rv-var-crumb">
                  <span className="crumb-from">{change.from}</span>
                  <span className="crumb-arrow">→</span>
                  <span className="crumb-to">{change.to}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
