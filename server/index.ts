import { loadEnvFile } from './env.js';
loadEnvFile();

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { runResearch } from './research.js';
import { getFinding, listFindings } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    name: '35 / Morning light',
    linkupKey: Boolean(process.env.LINKUP_API_KEY),
  });
});

app.get('/api/findings', (_req, res) => {
  res.json({ findings: listFindings(30) });
});

app.get('/api/findings/:id', (req, res) => {
  const found = getFinding(req.params.id);
  if (!found) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(found);
});

app.post('/api/research', async (req, res) => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Provide a Solana mint or token/pool query' });
      return;
    }
    if (!process.env.LINKUP_API_KEY) {
      res.status(503).json({ error: 'LINKUP_API_KEY is not set on the server' });
      return;
    }
    const result = await runResearch(query);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed';
    console.error('[research]', message);
    res.status(502).json({ error: message });
  }
});

const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`35 Morning light API on http://127.0.0.1:${PORT}`);
  console.log(`LINKUP_API_KEY: ${process.env.LINKUP_API_KEY ? 'set' : 'missing'}`);
});
