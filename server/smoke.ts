import { loadEnvFile } from './env.js';
loadEnvFile();

const keySet = Boolean(process.env.LINKUP_API_KEY);
console.log(`LINKUP_API_KEY: ${keySet ? 'set' : 'missing'}`);

if (!keySet) {
  console.log('Smoke skipped (no key). HTTP status: n/a');
  process.exit(0);
}

const res = await fetch('https://api.linkup.so/v1/search', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.LINKUP_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    q: 'Solana USDC mint overview',
    depth: 'standard',
    outputType: 'sourcedAnswer',
    includeImages: false,
  }),
});

console.log(`Smoke Linkup HTTP status: ${res.status}`);
process.exit(res.ok ? 0 : 1);
