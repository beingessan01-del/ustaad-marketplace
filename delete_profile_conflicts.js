const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pebbjenmssvavvvdiqlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanConflict() {
  try {
    console.log('Finding mock profile for zahid.ali@ustad.pk...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'zahid.ali@ustad.pk')
      .single();

    if (profile) {
      console.log(`Found mock profile ID: ${profile.id}. Deleting dependencies...`);
      
      // Delete from technician_status
      await supabase.from('technician_status').delete().eq('technician_id', profile.id);
      
      // Delete from technician_details
      await supabase.from('technician_details').delete().eq('profile_id', profile.id);
      
      // Delete from profiles
      const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
      
      if (error) {
        console.error('Failed to delete profile:', error);
      } else {
        console.log('Successfully cleared database conflicts for zahid.ali@ustad.pk!');
      }
    } else {
      console.log('No conflict found for zahid.ali@ustad.pk.');
    }
  } catch (e) {
    console.error('Error during cleanup:', e);
  }
}

cleanConflict();
