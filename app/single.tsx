'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '@/components/Spinner';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';

type Result = {
  email: string;
  status: 'valid' | 'accept-all' | 'not found';
  confidence: number;
  mx?: string | null;
};

export default function SingleLookup() {
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!result?.email) return;
    navigator.clipboard.writeText(result.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="card">
      <div className="card-body">
        <form onSubmit={submit} className="row">
          <div className="field">
            <label>First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="Jane"
              required
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLast(e.target.value)}
              placeholder="Doe"
              required
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>Domain</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
              required
              autoComplete="off"
            />
          </div>
          <motion.button
            type="submit"
            className="btn primary"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (<><Spinner /> Resolving</>) : 'Find email'}
          </motion.button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              className="err"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              className="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="kv">
                <strong>Email</strong>
                <span className="email-val">
                  {result.email || '—'}
                  {result.email && (
                    <button
                      className="copy-mini"
                      onClick={copy}
                      aria-label="Copy email"
                      title={copied ? 'Copied' : 'Copy'}
                    >
                      {copied ? '✓' : '⧉'}
                    </button>
                  )}
                </span>
              </div>
              <div className="kv">
                <strong>Status</strong>
                <span><StatusBadge status={result.status} /></span>
              </div>
              <div className="kv">
                <strong>Confidence</strong>
                <ConfidenceBar value={result.confidence} />
              </div>
              {result.mx && (
                <div className="kv">
                  <strong>MX record</strong>
                  <span className="mono" style={{ color: 'var(--ink-2)' }}>
                    {result.mx}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
