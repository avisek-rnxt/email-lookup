'use client';
import { motion } from 'framer-motion';

export function StatusBadge({ status }: { status: string }) {
  const cls = status.replace(/\s+/g, '-');
  return (
    <motion.span
      key={status}
      className={`badge ${cls}`}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
    >
      {status}
    </motion.span>
  );
}
