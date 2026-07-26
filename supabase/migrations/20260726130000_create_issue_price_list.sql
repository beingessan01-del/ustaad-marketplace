-- Migration: Create issue_price_list table for storing issue-based price estimates
-- Target Table: public.issue_price_list

CREATE TABLE IF NOT EXISTS public.issue_price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.issue_price_list ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for all authenticated and public users (read-only access from client)
CREATE POLICY "Allow read access to issue_price_list"
  ON public.issue_price_list
  FOR SELECT
  TO public
  USING (true);

-- Insert issue-based price estimate rows
INSERT INTO public.issue_price_list (issue_name, category, price_min, price_max, unit) VALUES
-- Plumbing
('Leaking/small tap replacement', 'plumbing', 200, 500, 'per job'),
('Tap/mixer repair or replacement', 'plumbing', 500, 1000, 'per job'),
('Drain blockage (sink)', 'plumbing', 500, 1000, 'per job'),
('Drain blockage (toilet/mainline)', 'plumbing', 1000, 2500, 'per job'),
('Toilet seat installation/replacement', 'plumbing', 800, 1500, 'per job'),
('Sink/basin installation', 'plumbing', 600, 1200, 'per job'),
('Geyser installation (instant type)', 'plumbing', 1200, 2000, 'per job'),
('Geyser installation (gas/classic type)', 'plumbing', 2000, 3000, 'per job'),
('Pressure pump/motor installation', 'plumbing', 2000, 3000, 'per job'),
('Water tank cleaning (plastic)', 'plumbing', 1200, 2000, 'per job'),
('Water tank cleaning (cement)', 'plumbing', 2000, 3500, 'per job'),

-- Electrical
('Breaker replacement (1/2 phase)', 'electrical', 400, 700, 'per job'),
('Breaker replacement (63amp)', 'electrical', 600, 1000, 'per job'),
('Short circuit / fault diagnosis', 'electrical', 800, 1500, 'per job'),
('Switch/socket/light point wiring repair', 'electrical', 300, 600, 'per job'),
('Exhaust fan installation', 'electrical', 800, 1500, 'per job'),
('UPS installation (single battery)', 'electrical', 800, 1500, 'per job'),
('CCTV camera installation', 'electrical', 800, 1500, 'per unit'),
('LED/LCD TV wall mounting', 'electrical', 800, 1500, 'per job'),
('Generator installation w/ changeover', 'electrical', 4000, 6000, 'per job'),

-- Mechanic/HVAC
('AC not cooling (diagnosis + basic fix)', 'mechanic', 1500, 3000, 'per job'),
('Split AC cleaning (normal)', 'mechanic', 1500, 2500, 'per job'),
('AC gas refilling', 'mechanic', 3000, 4000, 'per kg'),
('AC installation (split unit)', 'mechanic', 2500, 4000, 'per job'),
('Washing machine repair', 'mechanic', 1000, 2500, 'per job'),
('Microwave repair', 'mechanic', 800, 2000, 'per job'),

-- Painting
('Wall repaint - distemper/whitewash', 'painting', 30, 40, 'per sqft'),
('Wall repaint - plastic emulsion', 'painting', 45, 55, 'per sqft'),
('Wall repaint - enamel', 'painting', 55, 65, 'per sqft'),
('New paint (labor only)', 'painting', 25, 35, 'per sqft'),

-- Carpentry
('Door lock (complete) change', 'carpentry', 400, 700, 'per job'),
('Door hinges/handle change', 'carpentry', 400, 700, 'per job'),
('Door installation (new)', 'carpentry', 800, 1500, 'per job'),
('Drawer channel/lock change', 'carpentry', 300, 600, 'per job'),
('Wall hanging/picture installation', 'carpentry', 200, 400, 'per job'),

-- Cleaning
('Room cleaning', 'cleaning', 4, 6, 'per sqft'),
('Kitchen cleaning', 'cleaning', 6, 9, 'per sqft'),
('Bathroom cleaning', 'cleaning', 8, 11, 'per sqft'),
('One-time cleaning minimum charge', 'cleaning', 1500, 2500, 'per job');
