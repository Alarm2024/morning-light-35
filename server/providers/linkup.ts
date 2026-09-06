import type { SearchDepth, SearchResult } from './types.js';

const LINKUP_URL = 'https://api.linkup.so/v1/search';

export async function linkupSearch(query: string, depth: SearchDepth = 'standard'): Promise<SearchResult> {
  const apiKey = process.env.LINKUP_API_KEY;
  if (!apiKey) {
    throw new Error('LINKUP_API_KEY is not set');
  }

  const res = await fetch(LINKUP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      depth,
      outputType: 'sourcedAnswer',
      includeImages: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Linkup HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const sources: SearchResult['sources'] = [];

  const rawSources = (raw.sources as unknown[]) || [];
  for (const s of rawSources) {
    if (s && typeof s === 'object') {
      const o = s as Record<string, unknown>;
      sources.push({
        name: typeof o.name === 'string' ? o.name : typeof o.title === 'string' ? o.title : undefined,
        url: typeof o.url === 'string' ? o.url : undefined,
        snippet:
          typeof o.snippet === 'string'
            ? o.snippet
            : typeof o.content === 'string'
              ? String(o.content).slice(0, 400)
              : undefined,
        provider: 'linkup',
      });
    }
  }

  return {
    answer: typeof raw.answer === 'string' ? raw.answer : undefined,
    sources,
    raw,
    providers: ['linkup'],
  };
}
