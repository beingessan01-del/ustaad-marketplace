-- 1. Create job_messages table to store per-job messages
create table if not exists public.job_messages (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone
);

-- 2. Enable Row Level Security (RLS)
alter table public.job_messages enable row level security;

-- 3. Policy: Allow customers or matched technicians of the booking to read messages
drop policy if exists "Allow members of booking to view messages" on public.job_messages;
create policy "Allow members of booking to view messages" on public.job_messages
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = job_request_id
        and (auth.uid() = b.customer_id or auth.uid() = b.technician_id)
    )
  );

-- 4. Policy: Allow customers or matched technicians of the booking to send messages
drop policy if exists "Allow members of booking to insert messages" on public.job_messages;
create policy "Allow members of booking to insert messages" on public.job_messages
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = job_request_id
        and (auth.uid() = b.customer_id or auth.uid() = b.technician_id)
    ) and auth.uid() = sender_id
  );
