-- 1. Redefine match_booking_technicians trigger function as SECURITY DEFINER
create or replace function public.match_booking_technicians()
returns trigger as $$
declare
  tech record;
begin
  for tech in (
    select technician_id 
    from public.find_nearby_technicians(new.lat, new.lng, new.search_radius_km, new.service_category)
  ) loop
    insert into public.job_offers (job_request_id, technician_id, status, expires_at)
    select new.id, tech.technician_id, 'pending', now() + interval '20 seconds'
    where not exists (
      select 1 from public.job_offers 
      where job_request_id = new.id and technician_id = tech.technician_id
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Update select policies on public.bookings to allow offered technicians to view it
drop policy if exists "Allow users to view their own customer or assigned technician bookings" on public.bookings;

create policy "Allow users to view their own customer or assigned technician bookings"
on public.bookings for select
using (
  auth.uid() = customer_id 
  or auth.uid() = technician_id
  or exists (
    select 1 from public.job_offers jo
    where jo.job_request_id = id
      and jo.technician_id = auth.uid()
  )
);

-- 3. Update update policies on public.bookings to allow offered technicians to accept it
drop policy if exists "Allow customers or technicians to update their bookings" on public.bookings;

create policy "Allow customers or technicians to update their bookings"
on public.bookings for update
using (
  auth.uid() = customer_id 
  or auth.uid() = technician_id
  or exists (
    select 1 from public.job_offers jo
    where jo.job_request_id = id
      and jo.technician_id = auth.uid()
  )
);

-- 4. Update the booking trigger to fire on lat/lng updates as well
drop trigger if exists on_booking_dispatch on public.bookings;

create trigger on_booking_dispatch
  after insert or update of search_radius_km, lat, lng
  on public.bookings
  for each row
  when (new.status = 'pending')
  execute procedure public.match_booking_technicians();

-- 5. Safe registration of tables in supabase_realtime publication
do $$
begin
  -- bookings
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;

  -- job_offers
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'job_offers'
  ) then
    alter publication supabase_realtime add table public.job_offers;
  end if;

  -- job_messages
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'job_messages'
  ) then
    alter publication supabase_realtime add table public.job_messages;
  end if;
end $$;
