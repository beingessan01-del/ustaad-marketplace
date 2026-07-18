const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    const email = 'checkcols' + Math.floor(Math.random() * 100000) + '@ustad.pk';
    const password = 'Password123!';

    const { data: authData } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: 'Check Cols Customer', account_type: 'customer' } }
    });

    const customerId = authData.user.id;
    const bookingId = '77777777-7777-7777-7777-777777777777';
    await supabase.from('bookings').delete().eq('id', bookingId);

    const { data: booking, error } = await supabase
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
        price_estimate_max: 1500,
        price: 1200
      })
      .select();

    if (booking && booking[0]) {
      console.log('Bookings Column Keys in DB:', Object.keys(booking[0]));
      console.log('Sample Row:', booking[0]);
    } else {
      console.log('Error inserting booking:', error);
    }

    // Clean up
    await supabase.from('bookings').delete().eq('id', bookingId);
    await supabase.from('profiles').delete().eq('id', customerId);

  } catch (e) {
    console.error(e);
  }
}

checkColumns();
