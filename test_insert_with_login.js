const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  try {
    const email = 'testcustomer' + Math.floor(Math.random() * 1000000) + '@ustad.pk';
    const password = 'Password123!';

    console.log('Signing up customer:', email);
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Test Customer',
          account_type: 'customer'
        }
      }
    });

    if (authErr) {
      console.error('SignUp Error:', authErr);
      return;
    }

    const customerId = authData.user.id;
    console.log('Successfully registered and signed in customer:', customerId);

    // 2. Insert test booking
    const bookingId = '99999999-9999-9999-9999-999999999999';
    
    // Clean up any old booking just in case
    await supabase.from('bookings').delete().eq('id', bookingId);

    console.log('Inserting booking...');
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        customer_id: customerId,
        service_category: 'plumbing',
        lat: 33.7294,
        lng: 73.0561,
        address: 'Test House, F-7, Islamabad',
        status: 'pending',
        search_radius_km: 10.0
      })
      .select();

    if (bErr) {
      console.error('Booking Insert Error:', bErr);
    } else {
      console.log('Booking Inserted Successfully!', booking);

      // 3. Query job_offers
      console.log('Querying job offers created for this booking...');
      const { data: offers, error: oErr } = await supabase
        .from('job_offers')
        .select('*')
        .eq('job_request_id', bookingId);
      
      console.log('Job Offers Result:', oErr || offers);
    }

    // Clean up
    console.log('Cleaning up booking...');
    await supabase.from('bookings').delete().eq('id', bookingId);

    // Delete user from profile table
    console.log('Cleaning up profile...');
    await supabase.from('profiles').delete().eq('id', customerId);

  } catch (e) {
    console.error(e);
  }
}

testInsert();
