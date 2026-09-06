import { FormEvent, useEffect, useState } from 'react';
import type { ResearchRecord, Verdict } from './types';

const VERDICT_COPY: Record<Verdict, string> = {
  go: 'GO',
  wait: 'WAIT',
  caution: 'CAUTION',
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchRecord | null>(null);
  const [history, setHistory] = useState<ResearchRecord[]>([]);
  const [keyPresent, setKeyPresent] = useState<boolean | null>(null);
  const [researchProviders, setResearchProviders] = useState<string[]>([]);

  async function refreshHistory() {
    try {
      const res = await fetch('/api/findings');
      const data = await res.json();
      setHistory(data.findings || []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        setKeyPresent(Boolean(d.tavilyKey || d.linkupKey));
        setResearchProviders(Array.isArray(d.researchProviders) ? d.researchProviders : []);
      })
      .catch(() => setKeyPresent(null));
    refreshHistory();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">
          <span className="mark">35</span>
          <div>
            <h1>Morning light</h1>
            <p className="tagline">Morning light for Solana traders — research a mint/pool, save sources, next search, verdict.</p>
          </div>
        </div>
        <div className="pill">
          Research: {keyPresent === null ? '…' : keyPresent ? researchProviders.join(' + ') || 'ready' : 'missing key'}
        </div>
      </header>

      <form className="search" onSubmit={onSubmit}>
        <label htmlFor="q">Mint address or token/pool query</label>
        <div className="row">
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste Solana mint or e.g. BONK / Raydium SOL-USDC"
            autoComplete="off"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? 'Researching…' : 'Research'}
          </button>
        </div>
        <p className="hint">Public happy path — no login. Two research searches when angles are missing (Tavily and/or Linkup).</p>
      </form>

      {error && <div className="banner error">{error}</div>}

      {result && (
        <section className="panel result">
          <div className={`verdict verdict-${result.verdict}`}>
            <span className="verdict-label">{VERDICT_COPY[result.verdict]}</span>
            <p>{result.verdictReason}</p>
          </div>

          <div className="grid">
            <article>
              <h2>First search</h2>
              <code className="query">{result.firstQuery}</code>
              <p className="answer">{result.firstAnswer || 'No sourced answer returned.'}</p>
            </article>
            <article>
              <h2>Second search</h2>
              {result.secondQuery ? (
                <>
                  <code className="query">{result.secondQuery}</code>
                  <p className="answer">{result.secondAnswer || 'No sourced answer returned.'}</p>
                  <p className="meta">Filled missing angles from pass 1: {result.missingAngles.length ? 're-checked' : 'covered'}</p>
                </>
              ) : (
                <p className="answer muted">Skipped — first pass already touched risk/audit/liquidity/rug signals.</p>
              )}
            </article>
          </div>

          <div className="grid">
            <article>
              <h2>Sources</h2>
              <ul className="sources">
                {result.sources.length === 0 && <li className="muted">No sources stored.</li>}
                {result.sources.map((s, i) => (
                  <li key={`${s.url || s.name}-${i}`}>
                    <span className="pass">P{s.pass}</span>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.name || s.url}
                      </a>
                    ) : (
                      <span>{s.name || 'Untitled'}</span>
                    )}
                    {s.snippet && <p>{s.snippet}</p>}
                  </li>
                ))}
              </ul>
            </article>
            <article>
              <h2>Could not confirm</h2>
              <ul className="sources">
                {result.unconfirmed.length === 0 && <li className="muted">Nothing flagged as unconfirmed.</li>}
                {result.unconfirmed.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="meta">Stored at {formatTime(result.createdAt)} · id {result.id.slice(0, 8)}</p>
            </article>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Saved findings</h2>
        {history.length === 0 ? (
          <p className="muted">No research saved yet.</p>
        ) : (
          <ul className="history">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="history-item"
                  onClick={() => {
                    setResult(h);
                    setQuery(h.query);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span className={`chip chip-${h.verdict}`}>{VERDICT_COPY[h.verdict]}</span>
                  <span className="hq">{h.query}</span>
                  <span className="ht">{formatTime(h.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        <span>35 / Morning light</span>
        <span>Hackathon MVP · Tavily + Linkup search · local JSON store</span>
      </footer>
    </div>
  );
}
