-- Enable Row Level Security (RLS) on all orphan / leftover tables present in database
alter table public.payouts enable row level security;
alter table public.services enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.provider_locations enable row level security;

-- Since these tables are unused by the current version of the application,
-- we do not define any permissive select/insert/update policies.
-- This effectively blocks all public and authenticated access to these tables,
-- conforming to the strict database security audit requirement.
