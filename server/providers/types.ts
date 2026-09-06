export type ResearchProviderName = 'tavily' | 'linkup';

export type SearchSource = {
  name?: string;
  url?: string;
  snippet?: string;
  provider?: ResearchProviderName;
};

export type SearchResult = {
  answer?: string;
  sources: SearchSource[];
  raw: unknown;
  providers: ResearchProviderName[];
};

export type SearchDepth = 'standard' | 'deep';
