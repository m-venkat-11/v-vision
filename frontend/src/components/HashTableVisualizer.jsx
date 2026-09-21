import { Hash, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

/**
 * HashTableVisualizer — Ground-up rewrite based on Reference 3 (Hashing Chaining)
 *
 * Exact patterns from reference:
 *
 * FLOW PIPELINE (.flow):
 *   Each insert shows: [key] → [hash(key)=N] → [→ bucket N]
 *   Last chip: .chip.green (success) OR .chip.red + shake animation (collision)
 *   Arrow between chips: plain → text in color #64748b
 *
 * BUCKET TABLE:
 *   .bucket:          80px wide, 14px radius, rgba(255,255,255,.04) bg, 1.5px white/13% border
 *   .bucket.hit:      red glow ring (collision) — border-color: #ff5c7c, box-shadow red
 *   Bucket index:     absolute bottom:-20px label
 *   .chainitem:       blue glass + chainIn animation (translateY -10px → 0, scale .7 → 1)
 *
 * @keyframes shake (collision):
 *   0%,100%{translateX(0)} 25%{translateX(-4px)} 75%{translateX(4px)}
 *
 * @keyframes chainIn (new chain item):
 *   0%{opacity:0;transform:translateY(-10px) scale(.7)} 100%{opacity:1;transform:translateY(0) scale(1)}
 */
export default function HashTableVisualizer({ hashData, event, variables = {}, arrays = {} }) {
  const { tableSize, buckets, flow, collisionBucket, caption, title } = useMemo(() => {
    if (hashData) {
      return {
        tableSize:       hashData.size            || 5,
        buckets:         hashData.buckets          || {},
        flow:            hashData.flow             || [],
        collisionBucket: hashData.collisionBucket  ?? -1,
        caption:         hashData.caption          || '',
        title:           hashData.title            || 'Hash Table (Chaining)'
      };
    }

    const key      = variables?.key ?? variables?.val ?? 17;
    const cap      = variables?.size ?? variables?.capacity ?? 5;
    const hash     = typeof key === 'number' ? Math.abs(key % cap) : 2;

    // Demo buckets
    const bkts = { 0:[], 1:[], 2:[12, 17], 3:[8], 4:[] };
    const isCollision = bkts[hash]?.length > 1;

    const flowChips = [
      { text: `Key: ${key}`,              cls: 'neutral' },
      { text: `hash(${key}) = ${hash}`,   cls: 'amber'   },
      { text: `→ bucket ${hash}`,         cls: isCollision ? 'red' : 'green' }
    ];

    return {
      tableSize:       cap,
      buckets:         bkts,
      flow:            flowChips,
      collisionBucket: isCollision ? hash : -1,
      caption:         isCollision
        ? `<b>Collision</b> at bucket ${hash} — key ${key} chained onto it.`
        : `Key ${key} mapped to bucket ${hash} via modulo arithmetic.`,
      title: 'Hash Table — Separate Chaining'
    };
  }, [hashData, variables, arrays, event]);

  return (
    <div className="rv-hash-card">
      {/* Header */}
      <div className="rv-card-header">
        <Hash size={13} className="rv-icon-amber" />
        <span className="rv-card-title">{title}</span>
        <span className="rv-card-sub">key → hash(key) → bucket</span>
      </div>

      {/* Flow pipeline — exactly as reference .flow */}
      <div className="rv-hash-flow">
        {flow.map((chip, i) => {
          const chipCls = chip.cls || (typeof chip === 'string' ? 'neutral' : 'neutral');
          const text    = typeof chip === 'string' ? chip : chip.text;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={`rv-chip rv-chip-${chipCls}`}>{text}</div>
              {i < flow.length - 1 && <span className="rv-flow-arrow">→</span>}
            </div>
          );
        })}
      </div>

      {/* Bucket table — exactly as reference .table */}
      <div className="rv-hash-table">
        {Array.from({ length: tableSize }).map((_, bi) => {
          const items      = buckets[bi] || [];
          const isHit      = collisionBucket === bi;
          const isPopulated = items.length > 0;

          return (
            <div
              key={bi}
              className={`rv-bucket ${isHit ? 'rv-bucket-hit' : ''} ${isPopulated && !isHit ? 'rv-bucket-ok' : ''}`}
            >
              {/* Chain items */}
              <div className="rv-chain">
                {items.length === 0 ? (
                  <span className="rv-chain-null">—</span>
                ) : (
                  items.map((val, ci) => (
                    <div key={`${bi}-${val}-${ci}`} className="rv-chainitem">{val}</div>
                  ))
                )}
              </div>
              {/* Bucket index label — absolute bottom */}
              <span className="rv-bucket-idx">{bi}</span>
            </div>
          );
        })}
      </div>

      {/* Caption */}
      {caption && (
        <div className="rv-caption">
          <span className="rv-caption-dot dot-amber" />
          <span dangerouslySetInnerHTML={{ __html: caption }} />
        </div>
      )}
    </div>
  );
}
