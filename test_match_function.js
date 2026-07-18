const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  try {
    const { data, error } = await supabase
      .rpc('find_nearby_technicians', {
        job_lat: 33.7294,
        job_lng: 73.0561,
        radius_km: 10.0,
        category: 'plumbing'
      });

    console.log('--- GEOSPATIAL SEARCH RESULTS ---');
    console.log('Error:', error);
    console.log('Data:', data);
  } catch (e) {
    console.error(e);
  }
}

runTest();
