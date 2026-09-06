import { randomUUID } from 'node:crypto';
import { linkupSearch } from './linkup.js';
import { saveFinding } from './store.js';
import type { ResearchRecord, ResearchResponse, SourceHit, Verdict } from './types.js';

const ANGLES: { key: string; labels: string[]; searchHint: string }[] = [
  { key: 'risk', labels: ['risk', 'scam', 'warning', 'exploit', 'honeypot'], searchHint: 'risk scam warning red flags' },
  { key: 'audit', labels: ['audit', 'audited', 'security review', 'certik', 'ottersec'], searchHint: 'smart contract audit security review' },
  { key: 'liquidity', labels: ['liquidity', 'tvl', 'locked lp', 'lp lock', 'raydium', 'orca'], searchHint: 'liquidity TVL LP lock pool depth' },
  { key: 'rug', labels: ['rug', 'rugpull', 'renounced', 'mint authority', 'freeze authority'], searchHint: 'rug pull mint authority freeze authority' },
];

function blobOf(answer?: string, sources: { snippet?: string; name?: string }[] = []): string {
  return [answer || '', ...sources.map((s) => `${s.name || ''} ${s.snippet || ''}`)].join(' ').toLowerCase();
}

export function detectMissingAngles(text: string): string[] {
  return ANGLES.filter((a) => !a.labels.some((l) => text.includes(l))).map((a) => a.key);
}

function buildFirstQuery(input: string): string {
  const q = input.trim();
  const looksLikeMint = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
  if (looksLikeMint) {
    return `Solana token mint ${q} overview liquidity holders risk audit`;
  }
  return `Solana token or pool ${q} overview liquidity holders risk audit rug signals`;
}

function buildSecondQuery(input: string, missing: string[]): string {
  const hints = ANGLES.filter((a) => missing.includes(a.key)).map((a) => a.searchHint).join('; ');
  return `Solana ${input.trim()} focus: ${hints || 'risk audit liquidity rug signals'}`;
}

function scoreVerdict(text: string, missing: string[], sourceCount: number): { verdict: Verdict; reason: string; unconfirmed: string[] } {
  const unconfirmed: string[] = [];
  for (const a of ANGLES) {
    if (missing.includes(a.key)) unconfirmed.push(`No clear ${a.key} coverage in sources`);
  }

  const hasRug = /rug\s*pull|honeypot|drain|exploit|scam/.test(text);
  const hasAudit = /audit(ed)?|security review|certik|ottersec/.test(text);
  const hasLiq = /liquidity|tvl|lp lock|locked lp/.test(text);
  const thin = sourceCount < 2;

  if (hasRug) {
    return { verdict: 'caution', reason: 'Risk/rug language appeared in findings — dig deeper before sizing up.', unconfirmed };
  }
  if (thin || missing.length >= 3) {
    return { verdict: 'wait', reason: 'Too little confirmed coverage across risk/audit/liquidity/rug angles.', unconfirmed };
  }
  if (hasAudit && hasLiq && missing.length <= 1) {
    return { verdict: 'go', reason: 'Audit/liquidity signals present and major angles mostly covered — still DYOR.', unconfirmed };
  }
  if (missing.length >= 2) {
    return { verdict: 'wait', reason: 'Several research angles remain unconfirmed.', unconfirmed };
  }
  return { verdict: 'caution', reason: 'Partial coverage — proceed carefully and verify on-chain yourself.', unconfirmed };
}

export async function runResearch(input: string): Promise<ResearchResponse> {
  const firstQuery = buildFirstQuery(input);
  const first = await linkupSearch(firstQuery, 'standard');

  const firstBlob = blobOf(first.answer, first.sources);
  const missingAngles = detectMissingAngles(firstBlob);

  let secondQuery: string | null = null;
  let secondAnswer: string | undefined;
  const sources: SourceHit[] = first.sources.map((s) => ({ ...s, pass: 1 as const }));

  if (missingAngles.length > 0) {
    secondQuery = buildSecondQuery(input, missingAngles);
    const second = await linkupSearch(secondQuery, 'standard');
    secondAnswer = second.answer;
    for (const s of second.sources) sources.push({ ...s, pass: 2 });
  }

  const allBlob = blobOf([first.answer, secondAnswer].filter(Boolean).join('\n'), sources);
  const stillMissing = detectMissingAngles(allBlob);
  const { verdict, reason, unconfirmed } = scoreVerdict(allBlob, stillMissing, sources.length);

  const record: ResearchRecord = {
    id: randomUUID(),
    query: input.trim(),
    createdAt: new Date().toISOString(),
    firstQuery,
    secondQuery,
    firstAnswer: first.answer,
    secondAnswer,
    sources,
    missingAngles: stillMissing,
    unconfirmed,
    verdict,
    verdictReason: reason,
  };

  saveFinding(record);
  return { ...record, stored: true };
}
