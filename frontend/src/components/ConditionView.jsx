import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function ConditionView({ event, animationDuration }) {
  if (!event || event.eventType !== 'CONDITION_CHECKED') return null;

  const { sourceLine, conditionResult, variables, arrays } = event;

  // Extract condition
  const condMatch = sourceLine.match(/(?:if|else\s+if)\s*\((.+)\)\s*\{?\s*$/);
  const condition = condMatch ? condMatch[1].trim() : sourceLine.trim();

  // Try to parse operands and produce a substitution explanation
  let substitutionText = null;
  const compMatch = condition.match(/^(.+?)\s*(>|<|>=|<=|==|!=)\s*(.+)$/);
  if (compMatch && variables) {
    const leftRaw = compMatch[1].trim();
    const op = compMatch[2];
    const rightRaw = compMatch[3].trim();

    let leftVal = leftRaw;
    let rightVal = rightRaw;

    // Resolve array access or variable
    const arrMatch = leftRaw.match(/^(\w+)\[(\w+)\]$/);
    if (arrMatch && arrays && arrays[arrMatch[1]] && variables[arrMatch[2]] !== undefined) {
      const idx = variables[arrMatch[2]];
      const val = arrays[arrMatch[1]][idx];
      leftVal = `${arrMatch[1]}[${idx}] (${val})`;
    } else if (variables[leftRaw] !== undefined) {
      leftVal = `${leftRaw} (${variables[leftRaw]})`;
    }

    if (variables[rightRaw] !== undefined) {
      rightVal = `${rightRaw} (${variables[rightRaw]})`;
    }

    substitutionText = `${leftVal} ${op} ${rightVal}`;
  }

  const isTrue = conditionResult === true;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={`condition-eval-card ${isTrue ? 'result-true' : 'result-false'}`}
        key={`cond-${event.step}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: animationDuration / 1100 }}
      >
        <div className="condition-card-header">
          <div className="condition-tag">
            <HelpCircle size={13} />
            <span>Branch Condition Evaluation</span>
          </div>
          <div className={`condition-verdict-badge ${isTrue ? 'true' : 'false'}`}>
            {isTrue ? (
              <>
                <CheckCircle2 size={13} />
                <span>TRUE — Entering Branch</span>
              </>
            ) : (
              <>
                <XCircle size={13} />
                <span>FALSE — Skipping Branch</span>
              </>
            )}
          </div>
        </div>

        <div className="condition-expression-row">
          <div className="cond-code-box">
            <span className="kw-if">if</span>
            <span className="cond-paren">(</span>
            <span className="cond-expr">{condition}</span>
            <span className="cond-paren">)</span>
          </div>

          {substitutionText && (
            <div className="cond-substituted-row">
              <ArrowRight size={13} className="sub-arrow" />
              <span className="substituted-text">{substitutionText}</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
