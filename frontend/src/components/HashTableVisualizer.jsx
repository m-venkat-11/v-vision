import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * HashTableVisualizer
 * 
 * Visualizes Hash Table operations, hash calculations, and collision resolution (Separate Chaining).
 * Inspired by Claude Glass Hashing & USFCA Visualization.
 * Features:
 * - Flowing key -> hash(key) -> index calculation chips
 * - Collision shake in neon red
 * - Animated bucket chaining with drop-in link items
 */
export default function HashTableVisualizer({
  hashData,
  event,
  variables = {},
  arrays = {},
  animationDuration = 0.5
}) {
  const { size, buckets, flow, isCollision, collisionBucket, caption, title } = useMemo(() => {
    // 1. Direct hashData provided
    if (hashData) {
      return {
        size: hashData.size || 5,
        buckets: hashData.buckets || {},
        flow: hashData.flow || [],
        isCollision: hashData.isCollision || false,
        collisionBucket: hashData.collisionBucket ?? -1,
        caption: hashData.caption || '',
        title: hashData.title || 'Hash Table (Chaining)'
      };
    }

    // 2. Dynamic state from variables / arrays
    const key = variables?.key ?? variables?.val ?? 17;
    const tableSize = variables?.size ?? variables?.capacity ?? 5;
    const computedHash = typeof key === 'number' ? (key % tableSize) : 2;

    const currentBuckets = {
      0: [],
      1: [],
      2: [12, 17],
      3: [8],
      4: []
    };

    const hasCollision = computedHash === 2 && currentBuckets[2].length > 1;

    const flowChips = [
      `Key: ${key}`,
      `hash(${key}) = ${key} % ${tableSize}`,
      `Bucket: ${computedHash}`
    ];

    return {
      size: tableSize,
      buckets: currentBuckets,
      flow: flowChips,
      isCollision: hasCollision,
      collisionBucket: hasCollision ? computedHash : -1,
      caption: hasCollision ?
        `Collision at bucket ${computedHash} — Key ${key} chained onto bucket.` :
        `Key ${key} mapped to bucket ${computedHash} via modulo arithmetic.`,
      title: 'Hash Table (Separate Chaining)'
    };
  }, [hashData, variables, arrays, event]);

  return (
    <div className="glass-visualizer-card hashtable-glass-card">
      <div className="glass-card-header">
        <div className="header-badge">
          <Hash size={13} className="text-amber" />
          <span>{title}</span>
        </div>
        <span className="glass-subtext">Modulo Arithmetic & Collision Chaining</span>
      </div>

      {/* Flow Calculation Pipeline */}
      <div className="hash-flow-pipeline">
        {flow.map((stepStr, idx) => {
          const isLast = idx === flow.length - 1;
          let chipClass = 'hash-flow-chip';
          if (isLast) {
            chipClass += isCollision ? ' chip-collision-alert' : ' chip-success';
          }

          return (
            <div key={`flow-${idx}`} className="flow-step-container">
              <motion.div
                className={chipClass}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                <span>{stepStr}</span>
              </motion.div>
              {!isLast && <ArrowRight size={14} className="flow-arrow-icon" />}
            </div>
          );
        })}
      </div>

      {/* Hash Buckets & Chains Display */}
      <div className="hash-table-grid">
        {Array.from({ length: size }).map((_, bIdx) => {
          const chainItems = buckets[bIdx] || [];
          const isTargetBucket = collisionBucket === bIdx;

          let bucketClass = 'hash-bucket-slot';
          if (isTargetBucket && isCollision) bucketClass += ' bucket-shaking-collision';
          else if (chainItems.length > 0) bucketClass += ' bucket-populated';

          return (
            <div key={`bucket-${bIdx}`} className={bucketClass}>
              <div className="bucket-header-tag">
                <span className="bucket-index-label">[{bIdx}]</span>
                {chainItems.length > 1 && (
                  <span className="collision-badge">
                    <AlertTriangle size={10} />
                    <span>Coll</span>
                  </span>
                )}
              </div>

              {/* Chained Linked Items */}
              <div className="bucket-chain-list">
                <AnimatePresence>
                  {chainItems.length === 0 ? (
                    <span className="empty-chain-placeholder">NULL</span>
                  ) : (
                    chainItems.map((val, cIdx) => (
                      <motion.div
                        key={`chain-${bIdx}-${val}-${cIdx}`}
                        className="chain-entry-node"
                        initial={{ opacity: 0, scale: 0.6, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: cIdx * 0.08 }}
                      >
                        <span className="chain-val">{val}</span>
                        {cIdx < chainItems.length - 1 && <span className="chain-link-arrow">↓</span>}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synchronized Caption */}
      {caption && (
        <div className="glass-caption-bar">
          <span className="caption-dot amber-dot" />
          <span className="caption-text">{caption}</span>
        </div>
      )}
    </div>
  );
}
