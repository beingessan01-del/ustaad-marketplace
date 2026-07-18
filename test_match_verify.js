const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatch() {
  try {
    const email = 'verifycustomer' + Math.floor(Math.random() * 100000) + '@ustad.pk';
    const password = 'Password123!';

    console.log('1. Registering customer account...');
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: 'Verify Customer', account_type: 'customer' } }
    });

    if (authErr) {
      console.error('SignUp Error:', authErr);
      return;
    }

    const customerId = authData.user.id;
    console.log('Customer account created:', customerId);

    // 2. Insert booking
    const bookingId = '88888888-8888-8888-8888-888888888888';
    await supabase.from('bookings').delete().eq('id', bookingId);

    console.log('2. Inserting pending booking at F-7 coordinates...');
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        customer_id: customerId,
        service_category: 'plumbing',
        lat: 33.7294,
        lng: 73.0561,
        address: 'Verify House, F-7, Islamabad',
        status: 'pending',
        search_radius_km: 10.0,
        price_estimate_min: 1000,
        price_estimate_max: 1500
      })
      .select();

    if (bErr) {
      console.error('Booking Insert Error:', bErr);
    } else {
      console.log('Booking Inserted successfully!');

      // 3. Check for matching job offers
      console.log('3. Fetching generated job offers...');
      const { data: offers, error: oErr } = await supabase
        .from('job_offers')
        .select('*, profiles:technician_id(full_name)')
        .eq('job_request_id', bookingId);
      
      console.log('Job Offers Result:', oErr || offers);
    }

    // Clean up
    console.log('4. Cleaning up verification rows...');
    await supabase.from('bookings').delete().eq('id', bookingId);
    await supabase.from('profiles').delete().eq('id', customerId);

  } catch (e) {
    console.error(e);
  }
}

testMatch();
