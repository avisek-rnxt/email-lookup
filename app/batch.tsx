'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '@/components/Spinner';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';

type RowState = 'pending' | 'processing' | 'done';
type InRow = { uuid: string; firstName: string; lastName: string; domain: string };
type Out = { email: string; status: 'valid' | 'accept-all' | 'not found'; confidence: number } | null;

const REQUIRED = ['uuid', 'first name', 'last name', 'domain'];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0);
  if (!lines.length) return [];
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
    return row;
  });
}

function pick(row: Record<string, string>, name: string): string {
  const want = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(row)) {
    if (k.toLowerCase().trim() === want) return v;
  }
  return '';
}

function toCSV(rows: InRow[], results: Out[]): string {
  const header = ['UUID', 'First Name', 'Last Name', 'Domain', 'Email', 'Status', 'Confidence'];
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const body = rows.map((r, i) => {
    const out = results[i];
    return [
      r.uuid, r.firstName, r.lastName, r.domain,
      out?.email ?? '', out?.status ?? 'not found', (out?.confidence ?? 0).toFixed(2),
    ].map(esc).join(',');
  });
  return [header.join(','), ...body].join('\n');
}

export default function BatchLookup() {
  const [rows, setRows] = useState<InRow[]>([]);
  const [results, setResults] = useState<Out[]>([]);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doneCount = useMemo(() => results.filter((r) => r !== null).length, [results]);
  const validCount = useMemo(
    () => results.filter((r) => r?.status === 'valid').length,
    [results],
  );
  const pct = rows.length ? doneCount / rows.length : 0;

  async function loadFile(file: File) {
    setError(null);
    setRows([]);
    setResults([]);
    setActiveIdx(-1);
    setImporting(true);
    await new Promise((r) => setTimeout(r, 420));
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (!parsed.length) throw new Error('Empty CSV.');
      const headers = new Set(Object.keys(parsed[0]).map((h) => h.toLowerCase().trim()));
      const missing = REQUIRED.filter((r) => !headers.has(r));
      if (missing.length)
        throw new Error(
          `Missing columns: ${missing.join(', ')}. Required: UUID, First Name, Last Name, Domain.`,
        );
      const inRows: InRow[] = parsed.map((r) => ({
        uuid: pick(r, 'UUID'),
        firstName: pick(r, 'First Name'),
        lastName: pick(r, 'Last Name'),
        domain: pick(r, 'Domain'),
      }));
      setRows(inRows);
      setResults(Array(inRows.length).fill(null));
    } catch (e: any) {
      setError(e.message ?? 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    const next: Out[] = [...results];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setActiveIdx(i);
      if (!row.firstName || !row.lastName || !row.domain) {
        next[i] = { email: '', status: 'not found', confidence: 0 };
        setResults([...next]);
        continue;
      }
      try {
        const res = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: row.firstName,
            lastName: row.lastName,
            domain: row.domain,
          }),
        });
        const data = await res.json();
        next[i] = {
          email: data.email || '',
          status: data.status || 'not found',
          confidence: data.confidence ?? 0,
        };
      } catch {
        next[i] = { email: '', status: 'not found', confidence: 0 };
      }
      setResults([...next]);
    }
    setActiveIdx(-1);
    setRunning(false);
  }

  function reset() {
    setRows([]);
    setResults([]);
    setActiveIdx(-1);
    setError(null);
  }

  function download() {
    const csv = toCSV(rows, results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div className="card-body">
        <AnimatePresence mode="wait">
          {rows.length === 0 && !importing && (
            <motion.div
              key="drop"
              className={`drop ${dragging ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) loadFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className="drop-icon"
                animate={dragging ? { y: -4, rotate: -4 } : { y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </motion.div>
              <div>
                <strong>Drop a CSV here</strong>
              </div>
              <div className="small" style={{ marginTop: 10 }}>
                or click to choose · required columns:{' '}
                <kbd>UUID</kbd> <kbd>First Name</kbd> <kbd>Last Name</kbd>{' '}
                <kbd>Domain</kbd>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </motion.div>
          )}

          {importing && (
            <motion.div
              key="importing"
              className="drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="drop-icon"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              >
                ✦
              </motion.div>
              <div>
                <strong>Importing CSV…</strong>
              </div>
              <div className="small" style={{ marginTop: 8 }}>Parsing rows</div>
            </motion.div>
          )}
        </AnimatePresence>

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
          {rows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="progress-wrap">
                <div className="progress-head">
                  <span className="left">
                    {running ? (
                      <>
                        <Spinner />
                        Verifying <strong>{doneCount}</strong> of {rows.length}
                      </>
                    ) : doneCount === rows.length ? (
                      <>
                        ✓ Processed <strong>{doneCount}</strong> rows ·{' '}
                        <strong>{validCount}</strong> valid
                      </>
                    ) : (
                      <>
                        <strong>{rows.length}</strong> rows queued · ready to verify
                      </>
                    )}
                  </span>
                  <span className="pct">{Math.round(pct * 100).toString().padStart(2, '0')}%</span>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              <div className="toolbar">
                <motion.button
                  className="btn primary"
                  onClick={run}
                  disabled={running || doneCount === rows.length}
                  whileTap={{ scale: 0.98 }}
                >
                  {running ? (
                    <><Spinner /> Running</>
                  ) : doneCount === rows.length ? (
                    <>✓ Complete</>
                  ) : (
                    <>Verify {rows.length} rows</>
                  )}
                </motion.button>
                {doneCount > 0 && !running && (
                  <motion.button
                    className="btn"
                    onClick={download}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    ↓ Export CSV
                  </motion.button>
                )}
                <div className="spacer" />
                <button className="btn" onClick={reset} disabled={running}>
                  Reset
                </button>
              </div>

              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 84 }}>UUID</th>
                      <th>Name</th>
                      <th>Domain</th>
                      <th>Email</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 150 }}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const out = results[i];
                      const state: RowState = out
                        ? 'done'
                        : i === activeIdx
                          ? 'processing'
                          : 'pending';
                      return (
                        <motion.tr
                          key={r.uuid || i}
                          className={`row-${state}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: Math.min(i * 0.015, 0.35),
                            duration: 0.25,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <td className="mono small">{r.uuid.slice(0, 8)}</td>
                          <td>
                            {r.firstName} {r.lastName}
                          </td>
                          <td className="mono">{r.domain}</td>
                          <td className="mono">
                            {out?.email ? (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                {out.email}
                              </motion.span>
                            ) : state === 'processing' ? (
                              <Spinner />
                            ) : (
                              <span style={{ color: 'var(--ink-4)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {out ? (
                              <StatusBadge status={out.status} />
                            ) : state === 'processing' ? (
                              <StatusBadge status="pending" />
                            ) : (
                              <span style={{ color: 'var(--ink-4)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {out ? (
                              <ConfidenceBar value={out.confidence} small />
                            ) : (
                              <span style={{ color: 'var(--ink-4)' }}>—</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
