const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  try {
    // 1. Fetch technician status
    const { data: statuses, error: sErr } = await supabase
      .from('technician_status')
      .select('*');
    console.log('--- TECHNICIAN STATUSES ---', sErr || statuses);

    // 2. Fetch bookings
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('--- RECENT BOOKINGS ---', bErr || bookings);

    // 3. Fetch job offers
    const { data: offers, error: oErr } = await supabase
      .from('job_offers')
      .select('*')
      .order('offered_at', { ascending: false })
      .limit(5);
    console.log('--- RECENT JOB OFFERS ---', oErr || offers);

  } catch (e) {
    console.error('Error querying DB:', e);
  }
}

checkDb();
