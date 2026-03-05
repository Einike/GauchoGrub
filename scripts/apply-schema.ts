import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) { console.error('SUPABASE_DB_URL required'); process.exit(1); }

(async () => {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const dir   = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    console.log(`▶ ${file}`);
    try { await client.query(sql); console.log(`  ✓`); }
    catch (e: any) { console.warn(`  ⚠ ${e.message.split('\n')[0]}`); }
  }
  await client.end();
  console.log('✅ Schema applied');
})();
