-- Migration: Add digital wallet balance and wallet_transactions table

-- 1. Add wallet_balance column to technician_details if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='technician_details' and column_name='wallet_balance') then
    alter table public.technician_details add column wallet_balance numeric(10,2) default 0.00 not null;
  end if;
end $$;

-- Add wallet_balance column to profiles if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='wallet_balance') then
    alter table public.profiles add column wallet_balance numeric(10,2) default 0.00 not null;
  end if;
end $$;

-- 2. Create wallet_transactions table
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('TOPUP', 'COMMISSION_DEDUCTION')) not null,
  amount numeric(10,2) not null,
  reference_job_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS on wallet_transactions
alter table public.wallet_transactions enable row level security;

-- Policies for wallet_transactions
drop policy if exists "Allow technicians to view their own wallet transactions" on public.wallet_transactions;
create policy "Allow technicians to view their own wallet transactions" on public.wallet_transactions for select using (auth.uid() = technician_id);

drop policy if exists "Allow technicians to insert their own wallet transactions" on public.wallet_transactions;
create policy "Allow technicians to insert their own wallet transactions" on public.wallet_transactions for insert with check (auth.uid() = technician_id);
