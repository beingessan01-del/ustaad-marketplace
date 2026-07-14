const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Booking coordinates (F-7 Center)
const bookLat = 33.7294;
const bookLng = 73.0561;

async function diagnose() {
  try {
    console.log('=== 1. Checking Active Bookings/Job Requests ===');
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, service_category, lat, lng, search_radius_km')
      .order('created_at', { ascending: false })
      .limit(3);
    console.log('Recent bookings:', bookings);

    console.log('\n=== 2. Checking Online Technicians ===');
    const { data: statuses } = await supabase
      .from('technician_status')
      .select('technician_id, is_online, current_lat, current_lng, last_ping_at');
    
    console.log(`Found ${statuses ? statuses.length : 0} technician statuses in DB:`);
    
    if (statuses) {
      for (const s of statuses) {
        // Fetch details
        const { data: details } = await supabase
          .from('technician_details')
          .select('service_categories, specialty')
          .eq('profile_id', s.technician_id)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', s.technician_id)
          .single();

        // Calculate distance
        let distKm = 'Unknown';
        if (s.current_lat && s.current_lng) {
          const R = 6371; // radius of Earth in km
          const dLat = (s.current_lat - bookLat) * Math.PI / 180;
          const dLng = (s.current_lng - bookLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(bookLat * Math.PI / 180) * Math.cos(s.current_lat * Math.PI / 180) * 
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distKm = (R * c).toFixed(2);
        }

        console.log(`- Tech: ${profile?.full_name || 'No Name'} (${profile?.email || 'No Email'})`);
        console.log(`  Online: ${s.is_online}`);
        console.log(`  Location: [${s.current_lat}, ${s.current_lng}] (Distance to F-7 booking: ${distKm} km)`);
        console.log(`  Categories:`, details?.service_categories || 'None');
      }
    }
  } catch (e) {
    console.error('Error during diagnostics:', e);
  }
}
diagnose();
