'use client';

export function ConfidenceBar({ value, small = false }: { value: number; small?: boolean }) {
  const pct = Math.max(0, Math.min(1, value));
  const tone = pct >= 0.8 ? 'high' : pct >= 0.5 ? 'med' : 'low';
  return (
    <span className={`conf-pct ${tone}${small ? ' small' : ''}`}>
      {Math.round(pct * 100)}%
    </span>
  );
}
