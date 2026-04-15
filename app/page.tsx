'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SingleLookup from './single';
import BatchLookup from './batch';

type Tab = 'single' | 'batch';
type Theme = 'light' | 'dark';

export default function Page() {
  const [tab, setTab] = useState<Tab>('single');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('theme')) as Theme | null;
    const initial: Theme =
      stored ??
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  }

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="page-head">
        <div>
          <h1>Email finder</h1>
          <p className="page-sub">
            Look up professional emails by name and domain. Pattern detection
            runs against the live MX record; results are confidence-scored.
            Single or bulk via CSV.
          </p>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>

      <div className="tabs" role="tablist">
        {(['single', 'batch'] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            role="tab"
            aria-selected={tab === t}
          >
            {tab === t && (
              <motion.div
                layoutId="tab-indicator"
                className="tab-indicator"
                style={{ left: 0, right: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>
              {t === 'single' ? 'Single lookup' : 'Bulk (CSV)'}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {tab === 'single' ? <SingleLookup /> : <BatchLookup />}
        </motion.div>
      </AnimatePresence>

      <p className="foot">internal · email workbench</p>
    </motion.div>
  );
}
