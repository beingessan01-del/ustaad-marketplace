-- ==========================================
-- OPTION A: INCREMENTAL DATABASE SCHEMA UPDATE
-- ==========================================

-- 1. Create missing tables if they do not exist
create table if not exists public.technician_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  specialty text not null,
  bio text,
  years_experience integer default 0 not null,
  jobs_completed integer default 0 not null,
  avg_rating numeric(3,2) default 5.00 not null,
  service_categories text[] not null,
  service_radius_km numeric default 10.0 not null
);

create table if not exists public.technician_status (
  technician_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean default false not null,
  current_lat double precision,
  current_lng double precision,
  last_ping_at timestamp with time zone default timezone('utc'::text, now()) not null,
  active_job_id text
);

create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references public.bookings(id) on delete cascade not null, -- maps to bookings
  technician_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined', 'expired')) default 'pending' not null,
  offered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  job_updates boolean default true not null,
  promotions boolean default true not null
);

-- 2. Alter existing tables to append missing fields
-- Alter profiles
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email') then
    alter table public.profiles add column email text;
  end if;
end $$;

-- Alter Bookings (Job Requests schema)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='technician_id') then
    alter table public.bookings add column technician_id uuid references public.profiles(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='service_category') then
    alter table public.bookings add column service_category text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='description') then
    alter table public.bookings add column description text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='photo_urls') then
    alter table public.bookings add column photo_urls text[];
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='lat') then
    alter table public.bookings add column lat double precision;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='lng') then
    alter table public.bookings add column lng double precision;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='address') then
    alter table public.bookings add column address text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='price_estimate_min') then
    alter table public.bookings add column price_estimate_min numeric default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='price_estimate_max') then
    alter table public.bookings add column price_estimate_max numeric default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bookings' and column_name='search_radius_km') then
    alter table public.bookings add column search_radius_km numeric default 5.0;
  end if;
end $$;

-- Alter Messages (Chat Messages schema)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='role') then
    alter table public.messages add column role text check (role in ('user', 'assistant'));
  end if;
end $$;

-- Alter Reviews
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reviews' and column_name='technician_id') then
    alter table public.reviews add column technician_id uuid references public.profiles(id) on delete cascade;
  end if;
end $$;

-- 3. Enable RLS and setup policies
alter table public.profiles enable row level security;
alter table public.technician_details enable row level security;
alter table public.technician_status enable row level security;
alter table public.bookings enable row level security;
alter table public.job_offers enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.messages enable row level security;
alter table public.notification_preferences enable row level security;

-- Policies for profiles
drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles" on public.profiles for select using (true);
drop policy if exists "Allow users to update their own profile" on public.profiles;
create policy "Allow users to update their own profile" on public.profiles for update using (auth.uid() = id);

-- Policies for technician_details
drop policy if exists "Allow public read access to technician details" on public.technician_details;
create policy "Allow public read access to technician details" on public.technician_details for select using (true);
drop policy if exists "Allow technicians to update their own details" on public.technician_details;
create policy "Allow technicians to update their own details" on public.technician_details for update using (auth.uid() = profile_id);
drop policy if exists "Allow technicians to insert their own details" on public.technician_details;
create policy "Allow technicians to insert their own details" on public.technician_details for insert with check (auth.uid() = profile_id);

-- Policies for technician_status
drop policy if exists "Allow public read access to technician statuses" on public.technician_status;
create policy "Allow public read access to technician statuses" on public.technician_status for select using (true);
drop policy if exists "Allow technicians to update their own status" on public.technician_status;
create policy "Allow technicians to update their own status" on public.technician_status for update using (auth.uid() = technician_id);
drop policy if exists "Allow technicians to insert their own status" on public.technician_status;
create policy "Allow technicians to insert their own status" on public.technician_status for insert with check (auth.uid() = technician_id);

-- Policies for bookings
drop policy if exists "Allow users to view their own customer or assigned technician bookings" on public.bookings;
create policy "Allow users to view their own customer or assigned technician bookings" on public.bookings for select using (auth.uid() = customer_id or auth.uid() = technician_id);
drop policy if exists "Allow customers to insert their own bookings" on public.bookings;
create policy "Allow customers to insert their own bookings" on public.bookings for insert with check (auth.uid() = customer_id);
drop policy if exists "Allow customers or technicians to update their bookings" on public.bookings;
create policy "Allow customers or technicians to update their bookings" on public.bookings for update using (auth.uid() = customer_id or auth.uid() = technician_id);

-- Policies for job_offers
drop policy if exists "Allow technicians to view their own job offers" on public.job_offers;
create policy "Allow technicians to view their own job offers" on public.job_offers for select using (auth.uid() = technician_id);
drop policy if exists "Allow technicians to update their own job offers" on public.job_offers;
create policy "Allow technicians to update their own job offers" on public.job_offers for update using (auth.uid() = technician_id);
drop policy if exists "Allow customers to view job offers for their requests" on public.job_offers;
create policy "Allow customers to view job offers for their requests" on public.job_offers for select using (exists (select 1 from public.bookings where id = job_request_id and customer_id = auth.uid()));

-- Policies for reviews
drop policy if exists "Allow public read access to reviews" on public.reviews;
create policy "Allow public read access to reviews" on public.reviews for select using (true);
drop policy if exists "Allow customers to insert reviews for their own bookings" on public.reviews;
create policy "Allow customers to insert reviews for their own bookings" on public.reviews for insert with check (auth.uid() = customer_id);

-- Policies for saved_addresses
drop policy if exists "Allow users to manage their own saved addresses" on public.saved_addresses;
create policy "Allow users to manage their own saved addresses" on public.saved_addresses for all using (auth.uid() = user_id);

-- Policies for messages
drop policy if exists "Allow users to view their own chat messages" on public.messages;
create policy "Allow users to view their own chat messages" on public.messages for select using (auth.uid() = sender_id);
drop policy if exists "Allow users to insert their own chat messages" on public.messages;
create policy "Allow users to insert their own chat messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Policies for notification_preferences
drop policy if exists "Allow users to manage their own notification preferences" on public.notification_preferences;
create policy "Allow users to manage their own notification preferences" on public.notification_preferences for all using (auth.uid() = user_id);

-- 4. Auth trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.raw_user_meta_data->>'account_type', 'customer'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
