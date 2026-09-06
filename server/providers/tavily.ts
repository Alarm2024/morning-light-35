import { tavily } from '@tavily/core';
import type { SearchDepth, SearchResult } from './types.js';

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

type TavilySearchResponse = {
  answer?: string;
  results?: TavilyResult[];
  query?: string;
  responseTime?: number;
  requestId?: string;
};

function canonicalUrl(url: string): string {
  return url.split('?')[0].replace(/\/+$/, '');
}

export async function tavilySearch(query: string, depth: SearchDepth = 'standard'): Promise<SearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set');
  }

  const client = tavily({ apiKey });
  const searchDepth = depth === 'deep' ? 'advanced' : 'basic';

  const response = (await client.search(query, {
    searchDepth,
    chunksPerSource: 3,
    maxResults: 10,
    includeAnswer: 'basic',
    topic: 'general',
  })) as TavilySearchResponse;

  const sources: SearchResult['sources'] = [];
  for (const item of response.results || []) {
    const snippet = item.content?.trim();
    sources.push({
      name: item.title,
      url: item.url,
      snippet: snippet ? snippet.slice(0, 400) : undefined,
      provider: 'tavily',
    });
  }

  return {
    answer: response.answer,
    sources,
    raw: response,
    providers: ['tavily'],
  };
}

export { canonicalUrl };
