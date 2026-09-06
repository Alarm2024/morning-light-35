import { loadEnvFile } from './env.js';
loadEnvFile();

import { configuredProviders, hasResearchProvider } from './providers/index.js';
import { linkupSearch } from './providers/linkup.js';
import { tavilySearch } from './providers/tavily.js';

const providers = configuredProviders();
console.log(`Research providers configured: ${providers.length ? providers.join(', ') : 'none'}`);
console.log(`TAVILY_API_KEY: ${process.env.TAVILY_API_KEY ? 'set' : 'missing'}`);
console.log(`LINKUP_API_KEY: ${process.env.LINKUP_API_KEY ? 'set' : 'missing'}`);

if (!hasResearchProvider()) {
  console.log('Smoke skipped (no research API key). HTTP status: n/a');
  process.exit(0);
}

const query = 'Solana USDC mint overview';
let exitCode = 0;

if (process.env.TAVILY_API_KEY) {
  try {
    const result = await tavilySearch(query, 'standard');
    console.log(`Smoke Tavily: ok (${result.sources.length} sources)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`Smoke Tavily: failed (${message.slice(0, 120)})`);
    exitCode = 1;
  }
}

if (process.env.LINKUP_API_KEY) {
  try {
    const result = await linkupSearch(query, 'standard');
    console.log(`Smoke Linkup: ok (${result.sources.length} sources)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`Smoke Linkup: failed (${message.slice(0, 120)})`);
    exitCode = 1;
  }
}

process.exit(exitCode);
