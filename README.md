# GauchoGrub Final Full Launch (QR Handoff)

## Included
- Google OAuth login
- UCSB-only server auth checks on all API routes
- No UUID input in UI
- Live board (claim/lock)
- Seller listing create with **price cap $6** and free option
- Quantity fixed to **1 meal only**
- Seller can post only **1 listing every 90 minutes**
- Orders thread + messages
- Payment step (MVP simulated PI id)
- Seller accept -> listing moves off board
- Seller QR image upload in-thread
- Buyer completion confirm
- Re-runnable schema repair SQL for drifted DBs

## Run
1. `npm install`
2. `cp .env.example .env.local`
3. Fill env vars in `.env.local`
4. Run `supabase/schema.sql` in Supabase SQL Editor
5. `npm run dev`
6. Open `/login`

## Important
- If listing creation fails due old schema, rerun `supabase/schema.sql` (it now includes repair `ALTER TABLE` lines).
- Stripe flow is still MVP simulated in `/api/orders/[id]/pay`.
