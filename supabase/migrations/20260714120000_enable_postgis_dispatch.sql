-- 1. Enable PostGIS extension if not already present
create extension if not exists postgis;

-- 2. Add location geography column and GIST index
alter table public.technician_status add column if not exists location geography(Point, 4326);
create index if not exists technician_status_location_idx on public.technician_status using gist(location);

-- 3. Create helper function to automatically keep location in sync with lat/lng
create or replace function public.update_technician_location()
returns trigger as $$
begin
  if new.current_lat is not null and new.current_lng is not null then
    new.location := ST_SetSRID(ST_MakePoint(new.current_lng, new.current_lat), 4326)::geography;
  else
    new.location := null;
  end if;
  return new;
end;
$$ language plpgsql;

-- 4. Create trigger to run before insert or update on technician_status
drop trigger if exists on_technician_location_update on public.technician_status;
create trigger on_technician_location_update
  before insert or update of current_lat, current_lng
  on public.technician_status
  for each row execute procedure public.update_technician_location();

-- 5. Create the geospatial query function for nearby online technicians
create or replace function public.find_nearby_technicians(
  job_lat double precision,
  job_lng double precision,
  radius_km double precision,
  category text
)
returns table (
  technician_id uuid,
  full_name text,
  specialty text,
  avatar_url text,
  distance_meters double precision,
  current_lat double precision,
  current_lng double precision
) as $$
begin
  return query
  select 
    ts.technician_id,
    p.full_name,
    td.specialty,
    p.avatar_url,
    st_distance(ts.location, st_setsrid(st_makepoint(job_lng, job_lat), 4326)::geography) as distance_meters,
    ts.current_lat,
    ts.current_lng
  from public.technician_status ts
  join public.profiles p on p.id = ts.technician_id
  join public.technician_details td on td.profile_id = ts.technician_id
  where ts.is_online = true
    and ts.active_job_id is null
    and category = any(td.service_categories)
    and st_dwithin(ts.location, st_setsrid(st_makepoint(job_lng, job_lat), 4326)::geography, radius_km * 1000)
  order by ts.location <-> st_setsrid(st_makepoint(job_lng, job_lat), 4326)::geography;
end;
$$ language plpgsql stable;

-- 6. Create trigger function to automatically match bookings and create job_offers
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
$$ language plpgsql;

-- 7. Add trigger to bookings for automatic dispatch orchestration
drop trigger if exists on_booking_dispatch on public.bookings;
create trigger on_booking_dispatch
  after insert or update of search_radius_km
  on public.bookings
  for each row
  when (new.status = 'searching')
  execute procedure public.match_booking_technicians();
