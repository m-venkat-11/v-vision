import { CheckCircle2, XCircle, HelpCircle, ArrowRight } from 'lucide-react';

/**
 * ConditionView — Ground-up rewrite based on Reference 1, Section 2
 * 
 * Exact 4-state sequence from reference:
 *   State 1: Plain .box       → neutral glass  (just showing the expression)
 *   State 2: .box.compare     → amber scanpulse (evaluating)
 *   State 3: .box.true/.false → green/red glow (resolved)
 *   State 4: .branch.taken    → green solid border (branch entered)
 * 
 * We derive state from conditionResult:
 *   null / undefined → compare (scanpulse)
 *   true             → true + taken if-branch
 *   false            → false + taken else-branch
 */
export default function ConditionView({ event }) {
  const isCond = event?.eventType === 'CONDITION_CHECKED' ||
    event?.conditionResult !== undefined ||
    /^\s*(?:if|else\s+if)\s*\(/.test(event?.sourceLine || '');
  if (!event || !isCond) return null;

  const { sourceLine, conditionResult, variables, arrays } = event;

  // Extract condition text from source line
  const condMatch = sourceLine?.match(/(?:if|else\s+if|while|for)\s*\((.+)\)\s*\{?\s*$/);
  const condition = condMatch ? condMatch[1].trim() : (sourceLine?.trim() || '');

  // Build substituted values text
  let substituted = null;
  const cmpMatch = condition.match(/^(.+?)\s*(>|<|>=|<=|==|!=)\s*(.+)$/);
  if (cmpMatch && variables) {
    const leftRaw  = cmpMatch[1].trim();
    const op       = cmpMatch[2];
    const rightRaw = cmpMatch[3].trim();
    let leftVal    = leftRaw;
    let rightVal   = rightRaw;

    const arrL = leftRaw.match(/^(\w+)\[(\w+)\]$/);
    if (arrL && arrays?.[arrL[1]] && variables[arrL[2]] !== undefined) {
      leftVal = String(arrays[arrL[1]][variables[arrL[2]]]);
    } else if (variables[leftRaw] !== undefined) {
      leftVal = String(variables[leftRaw]);
    }
    if (variables[rightRaw] !== undefined) rightVal = String(variables[rightRaw]);
    substituted = `${leftVal} ${op} ${rightVal}`;
  }

  const isTrue  = conditionResult === true;
  const isFalse = conditionResult === false;
  const resolved = isTrue || isFalse;

  // Condition box state → reference CSS class semantics
  const condBoxState = !resolved ? 'compare' : (isTrue ? 'true' : 'false');

  return (
    <div className="rv-cond-card">
      {/* Row 1: condition expression box */}
      <div className="rv-cond-row">
        <div className={`rv-box rv-box-${condBoxState}`}>
          <span className="rv-box-kw">if</span>
          <span className="rv-box-paren">(</span>
          <span className="rv-box-expr">{condition}</span>
          <span className="rv-box-paren">)</span>
        </div>

        {substituted && (
          <>
            <span className="rv-cond-arrow">→</span>
            <div className="rv-box rv-box-neutral">
              <span className="rv-box-sub">{substituted}</span>
            </div>
          </>
        )}

        {resolved && (
          <div className={`rv-verdict-badge rv-verdict-${condBoxState}`}>
            {isTrue
              ? <><CheckCircle2 size={13} /><span>TRUE</span></>
              : <><XCircle size={13} /><span>FALSE</span></>
            }
          </div>
        )}
      </div>

      {/* Row 2: branches (dashed = not taken, solid = taken) — Reference 1 pattern */}
      <div className="rv-branch-row">
        <div className={`rv-branch ${isTrue ? 'rv-branch-taken' : ''}`}>
          <span className="rv-branch-kw">if</span>
          <span className="rv-branch-body"> … true branch</span>
          {isTrue && <CheckCircle2 size={11} className="rv-branch-tick" />}
        </div>
        <div className={`rv-branch ${isFalse ? 'rv-branch-taken rv-branch-taken-false' : ''}`}>
          <span className="rv-branch-kw">else</span>
          <span className="rv-branch-body"> … false branch</span>
          {isFalse && <XCircle size={11} className="rv-branch-tick-false" />}
        </div>
      </div>

      {/* Caption */}
      <div className="rv-caption">
        <span className={`rv-caption-dot ${isTrue ? 'dot-green' : isFalse ? 'dot-red' : 'dot-amber'}`} />
        <span>
          {!resolved
            ? <>Operands compared, evaluating <b>{condition}</b>…</>
            : isTrue
              ? <>Condition <b>true</b> — entering if-branch.</>
              : <>Condition <b>false</b> — skipping if-branch.</>
          }
        </span>
      </div>
    </div>
  );
}
