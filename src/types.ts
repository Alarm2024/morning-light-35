export type Verdict = 'go' | 'wait' | 'caution';

export type SourceHit = {
  name?: string;
  url?: string;
  snippet?: string;
  pass: 1 | 2;
};

export type ResearchRecord = {
  id: string;
  query: string;
  createdAt: string;
  firstQuery: string;
  secondQuery: string | null;
  firstAnswer?: string;
  secondAnswer?: string;
  sources: SourceHit[];
  missingAngles: string[];
  unconfirmed: string[];
  verdict: Verdict;
  verdictReason: string;
  stored?: boolean;
};
