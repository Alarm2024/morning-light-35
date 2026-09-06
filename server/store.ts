import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResearchRecord } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'findings.json');

function ensureStore(): ResearchRecord[] {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, '[]', 'utf8');
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as ResearchRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listFindings(limit = 20): ResearchRecord[] {
  return ensureStore()
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getFinding(id: string): ResearchRecord | undefined {
  return ensureStore().find((r) => r.id === id);
}

export function saveFinding(record: ResearchRecord): ResearchRecord {
  const all = ensureStore();
  all.push(record);
  fs.writeFileSync(STORE_FILE, JSON.stringify(all, null, 2), 'utf8');
  return record;
}
