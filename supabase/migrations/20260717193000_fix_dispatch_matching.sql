-- 1. Create security definer function to check customer booking ownership bypassing RLS
create or replace function public.check_customer_booking(booking_uuid uuid, user_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.bookings
    where id = booking_uuid and customer_id = user_uuid
  );
end;
$$ language plpgsql security definer;

-- 2. Create security definer function to check technician job offer receipt bypassing RLS
create or replace function public.check_technician_offer(booking_uuid uuid, user_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.job_offers
    where job_request_id = booking_uuid and technician_id = user_uuid
  );
end;
$$ language plpgsql security definer;

-- 3. Redefine match_booking_technicians trigger function as SECURITY DEFINER
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

-- 4. Update select policies on public.bookings to allow offered technicians to view it
drop policy if exists "Allow users to view their own customer or assigned technician bookings" on public.bookings;

create policy "Allow users to view their own customer or assigned technician bookings"
on public.bookings for select
using (
  auth.uid() = customer_id 
  or auth.uid() = technician_id
  or public.check_technician_offer(id, auth.uid())
);

-- 5. Update update policies on public.bookings to allow offered technicians to accept it
drop policy if exists "Allow customers or technicians to update their bookings" on public.bookings;

create policy "Allow customers or technicians to update their bookings"
on public.bookings for update
using (
  auth.uid() = customer_id 
  or auth.uid() = technician_id
  or public.check_technician_offer(id, auth.uid())
);

-- 6. Update select policies on public.job_offers to prevent recursion
drop policy if exists "Allow customers to view job offers for their requests" on public.job_offers;

create policy "Allow customers to view job offers for their requests"
on public.job_offers for select
using (
  public.check_customer_booking(job_request_id, auth.uid())
);

-- 7. Update the booking trigger to fire on lat/lng updates as well
drop trigger if exists on_booking_dispatch on public.bookings;

create trigger on_booking_dispatch
  after insert or update of search_radius_km, lat, lng
  on public.bookings
  for each row
  when (new.status = 'pending')
  execute procedure public.match_booking_technicians();

-- 8. Safe registration of tables in supabase_realtime publication
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
