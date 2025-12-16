import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uiegfwnlphfblvzupziu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZWdmd25scGhmYmx2enVweml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzNTA0MjcsImV4cCI6MjA0NTkyNjQyN30.8VIhEOhEYBQr2Dw7yEYGgXv3vhYrgAeP4J4VE_OOi7I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSupabase() {
  console.log('=== TEST SUPABASE ===');
  console.log('URL:', SUPABASE_URL);
  console.log('');

  // Test 1: Check if items table exists
  console.log('Test 1: Fetching all items (simple select)');
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ Error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
    } else {
      console.log('✅ Success! Found', data?.length || 0, 'items');
      if (data && data.length > 0) {
        console.log('First item:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n---\n');

  // Test 2: Try with joined tables
  console.log('Test 2: Fetching items with joined tables');
  try {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        item_photos(id, url),
        profiles(id, name),
        rewards(id, amount)
      `)
      .limit(5);

    if (error) {
      console.log('❌ Error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
    } else {
      console.log('✅ Success! Found', data?.length || 0, 'items with joins');
      if (data && data.length > 0) {
        console.log('First item:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n---\n');

  // Test 3: Check if we can access profiles table
  console.log('Test 3: Fetching from profiles table');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (error) {
      console.log('❌ Error:', error);
    } else {
      console.log('✅ Success! Found', data?.length || 0, 'profiles');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testSupabase().catch(console.error);
