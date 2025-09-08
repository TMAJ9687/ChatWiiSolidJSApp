// Quick test script to verify admin user setup
import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'your-supabase-url';
const supabaseServiceKey = 'your-service-role-key'; // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminSetup() {
  try {
    console.log('Testing admin user setup...');
    
    // Check if admin user exists in users table
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', '88e25581-7922-4f81-8241-07cb49964289')
      .single();
    
    if (error) {
      console.error('Error finding admin user:', error);
      return;
    }
    
    if (adminUser) {
      console.log('✅ Admin user found in database:');
      console.log(`ID: ${adminUser.id}`);
      console.log(`Nickname: ${adminUser.nickname}`);
      console.log(`Role: ${adminUser.role}`);
      console.log(`Age: ${adminUser.age}`);
      console.log(`Country: ${adminUser.country}`);
      console.log(`Gender: ${adminUser.gender}`);
      console.log(`Status: ${adminUser.status}`);
    } else {
      console.log('❌ Admin user not found in database');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAdminSetup();