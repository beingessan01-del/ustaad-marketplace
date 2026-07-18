const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetails() {
  try {
    const { data: details, error: dErr } = await supabase
      .from('technician_details')
      .select('*');

    console.log('--- TECHNICIAN DETAILS ROWS IN DB ---', dErr || details);

    const { data: status, error: sErr } = await supabase
      .from('technician_status')
      .select('*');

    console.log('--- TECHNICIAN STATUS ROWS IN DB ---', sErr || status);
  } catch (e) {
    console.error(e);
  }
}

checkDetails();
