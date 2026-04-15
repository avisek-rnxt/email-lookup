'use client';
import { motion } from 'framer-motion';

export function ConfidenceBar({ value, small = false }: { value: number; small?: boolean }) {
  const pct = Math.max(0, Math.min(1, value));
  const tone = pct >= 0.8 ? 'high' : pct >= 0.5 ? 'med' : 'low';
  return (
    <div className={`conf${small ? ' small' : ''}`}>
      <div className="conf-track">
        <motion.div
          className={`conf-fill ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="conf-text">{Math.round(pct * 100)}%</span>
    </div>
  );
}
