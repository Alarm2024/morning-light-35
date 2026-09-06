import { linkupSearch } from './linkup.js';
import { canonicalUrl, tavilySearch } from './tavily.js';
import type { ResearchProviderName, SearchDepth, SearchResult, SearchSource } from './types.js';

export type { ResearchProviderName, SearchDepth, SearchResult, SearchSource } from './types.js';

export function configuredProviders(): ResearchProviderName[] {
  const providers: ResearchProviderName[] = [];
  if (process.env.TAVILY_API_KEY) providers.push('tavily');
  if (process.env.LINKUP_API_KEY) providers.push('linkup');
  return providers;
}

export function hasResearchProvider(): boolean {
  return configuredProviders().length > 0;
}

function mergeAnswers(preferred?: string, secondary?: string): string | undefined {
  const a = preferred?.trim();
  const b = secondary?.trim();
  if (a && b) {
    if (a === b) return a;
    return `${a}\n\n---\n\n${b}`;
  }
  return a || b;
}

function mergeSources(primary: SearchSource[], secondary: SearchSource[]): SearchSource[] {
  const merged = new Map<string, SearchSource>();

  for (const source of [...primary, ...secondary]) {
    const key = source.url ? canonicalUrl(source.url) : `${source.provider || 'unknown'}:${source.name || source.snippet || ''}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...source });
      continue;
    }
    merged.set(key, {
      name: existing.name || source.name,
      url: existing.url || source.url,
      snippet: existing.snippet || source.snippet,
      provider: existing.provider === source.provider ? existing.provider : undefined,
    });
  }

  return [...merged.values()];
}

function mergeSearchResults(tavily: SearchResult | null, linkup: SearchResult | null): SearchResult {
  const providers: ResearchProviderName[] = [];
  if (tavily) providers.push('tavily');
  if (linkup) providers.push('linkup');

  return {
    answer: mergeAnswers(tavily?.answer, linkup?.answer),
    sources: mergeSources(tavily?.sources || [], linkup?.sources || []),
    raw: { tavily: tavily?.raw ?? null, linkup: linkup?.raw ?? null },
    providers,
  };
}

export async function researchSearch(query: string, depth: SearchDepth = 'standard'): Promise<SearchResult> {
  const hasTavily = Boolean(process.env.TAVILY_API_KEY);
  const hasLinkup = Boolean(process.env.LINKUP_API_KEY);

  if (!hasTavily && !hasLinkup) {
    throw new Error('No research API key configured (set TAVILY_API_KEY and/or LINKUP_API_KEY)');
  }

  if (hasTavily && hasLinkup) {
    const [tavilyOutcome, linkupOutcome] = await Promise.allSettled([
      tavilySearch(query, depth),
      linkupSearch(query, depth),
    ]);

    const tavily = tavilyOutcome.status === 'fulfilled' ? tavilyOutcome.value : null;
    const linkup = linkupOutcome.status === 'fulfilled' ? linkupOutcome.value : null;

    if (!tavily && !linkup) {
      const tavilyErr = tavilyOutcome.status === 'rejected' ? tavilyOutcome.reason : null;
      const linkupErr = linkupOutcome.status === 'rejected' ? linkupOutcome.reason : null;
      const message =
        tavilyErr instanceof Error ? tavilyErr.message : linkupErr instanceof Error ? linkupErr.message : 'Research failed';
      throw new Error(message);
    }

    return mergeSearchResults(tavily, linkup);
  }

  if (hasTavily) return tavilySearch(query, depth);
  return linkupSearch(query, depth);
}
