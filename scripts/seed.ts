import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB  = process.env.SUPABASE_DB_URL!;

if (!URL||!KEY||!DB) { console.error('Missing env vars'); process.exit(1); }

const ACCOUNTS = [
  { email: 'seller_test@ucsb.edu',  password: 'TestPass123!', username: 'seller_test'  },
  { email: 'buyer_test@ucsb.edu',   password: 'TestPass123!', username: 'buyer_test'   },
  { email: 'buyer2_test@ucsb.edu',  password: 'TestPass123!', username: 'buyer2_test'  },
];

(async () => {
  const admin = createClient(URL, KEY, { auth: { persistSession: false } });
  const pg    = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  for (const acc of ACCOUNTS) {
    const { data: list } = await admin.auth.admin.listUsers();
    const found = list?.users.find(u => u.email === acc.email);
    let uid: string;

    if (found) {
      uid = found.id;
      await admin.auth.admin.updateUserById(uid, { password: acc.password });
      console.log(`✓ updated  ${acc.email}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: acc.email, password: acc.password, email_confirm: true,
      });
      if (error) { console.error(`✗ ${acc.email}:`, error.message); continue; }
      uid = data.user.id;
      console.log(`✓ created  ${acc.email}`);
    }

    await pg.query(
      `insert into profiles(id,email,username)
       values($1,$2,$3)
       on conflict(id) do update set username=$3, email=$2`,
      [uid, acc.email, acc.username]
    );
    console.log(`  @${acc.username}`);
  }

  await pg.end();
  console.log('\n✅ Seed done → http://localhost:3000/dev/login');
})();
