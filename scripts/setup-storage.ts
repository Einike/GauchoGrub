/**
 * Creates the 'order-qr' private bucket and sets storage policies.
 * Run: npm run storage:setup
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const BUCKET = 'order-qr';

(async () => {
  const admin = createClient(URL, KEY, { auth: { persistSession: false } });

  // Check if bucket exists
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) { console.error('Cannot list buckets:', listErr.message); process.exit(1); }

  const exists = buckets?.some(b => b.id === BUCKET);
  if (exists) {
    console.log(`✓ Bucket '${BUCKET}' already exists`);
  } else {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: ['image/png','image/jpeg','image/webp','image/gif'],
    });
    if (error) { console.error('Failed to create bucket:', error.message); process.exit(1); }
    console.log(`✓ Created private bucket '${BUCKET}'`);
  }

  console.log('✅ Storage setup complete.');
  console.log('   Note: Storage RLS policies are applied via migration 0003.');
})();
