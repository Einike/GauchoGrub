create extension if not exists pgcrypto;

-- Safe enum creation (re-runnable)
do $$ begin
  create type role_mode as enum ('buyer','seller');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('open','locked','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('draft','locked','paid','seller_accepted','qr_uploaded','completed','cancelled','refunded');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key,
  email text unique not null check (email like '%@ucsb.edu'),
  username text unique not null,
  display_name text,
  avatar_url text,
  role_mode role_mode not null default 'buyer',
  rating_avg numeric(3,2) not null default 5.00,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists seller_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  stripe_account_id text,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id) on delete cascade,
  dining_location text not null default 'Ortega',
  price_cents int not null default 0 check (price_cents >= 0 and price_cents <= 600),
  available_quantity int not null default 1 check (available_quantity > 0 and available_quantity <= 3),
  quantity_remaining int not null default 1 check (quantity_remaining >= 0),
  status listing_status not null default 'open',
  expires_at timestamptz not null default now() + interval '1 hour',
  lock_until timestamptz,
  locked_by uuid references users(id),
  pickup_start timestamptz,
  pickup_end timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id),
  seller_id uuid references users(id),
  buyer_id uuid references users(id),
  status order_status not null default 'draft',
  quantity int not null default 1 check (quantity > 0),
  customizations text,
  amount_cents int not null default 0,
  platform_fee_cents int not null default 0,
  seller_payout_cents int not null default 0,
  payment_intent_id text,
  payment_captured boolean not null default false,
  lock_expires_at timestamptz,
  seller_accept_by timestamptz,
  qr_uploaded_at timestamptz,
  qr_image_url text,
  refund_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sender_id uuid not null references users(id),
  content text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  reviewer_id uuid not null references users(id),
  reviewee_id uuid not null references users(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(order_id, reviewer_id)
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  reporter_id uuid not null references users(id),
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- repair existing drifted tables
alter table if exists listings add column if not exists status listing_status default 'open';
alter table if exists listings add column if not exists created_at timestamptz default now();
alter table if exists listings add column if not exists expires_at timestamptz default now() + interval '1 hour';
alter table if exists listings add column if not exists tags text[] default '{}';
alter table if exists listings add column if not exists available_quantity int default 1;
alter table if exists listings add column if not exists quantity_remaining int default 1;
alter table if exists listings add column if not exists lock_until timestamptz;
alter table if exists listings add column if not exists locked_by uuid references users(id);
alter table if exists listings add column if not exists pickup_start timestamptz;
alter table if exists listings add column if not exists pickup_end timestamptz;
alter table if exists listings add column if not exists price_cents int default 0;
alter table if exists listings add column if not exists dining_location text default 'Ortega';

-- if old schema required pickup_start, force safe defaults
update listings set pickup_start = coalesce(pickup_start, created_at, now());
update listings set pickup_end = coalesce(pickup_end, expires_at, now() + interval '30 minutes');

alter table if exists orders add column if not exists status order_status default 'draft';
alter table if exists orders add column if not exists created_at timestamptz default now();
alter table if exists orders add column if not exists updated_at timestamptz default now();
alter table if exists orders add column if not exists payment_captured boolean default false;
alter table if exists orders add column if not exists qr_image_url text;
alter table if exists orders add column if not exists customizations text;
alter table if exists orders add column if not exists amount_cents int default 0;
alter table if exists orders add column if not exists platform_fee_cents int default 0;
alter table if exists orders add column if not exists seller_payout_cents int default 0;

-- tighten constraints (safe)
alter table listings drop constraint if exists listings_price_cents_check;
alter table listings add constraint listings_price_cents_check check (price_cents >= 0 and price_cents <= 600);
alter table listings drop constraint if exists listings_available_quantity_check;
alter table listings add constraint listings_available_quantity_check check (available_quantity > 0 and available_quantity <= 3);

create index if not exists listings_status_idx on listings(status);
create index if not exists listings_created_at_idx on listings(created_at desc);
create index if not exists orders_buyer_idx on orders(buyer_id, created_at desc);
create index if not exists orders_seller_idx on orders(seller_id, created_at desc);
create index if not exists orders_status_idx on orders(status);
create index if not exists messages_order_idx on messages(order_id, created_at);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
