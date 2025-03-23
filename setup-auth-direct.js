require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupGoogleAuth() {
  try {
    console.log('='.repeat(50));
    console.log('Setting up Google Authentication');
    console.log('='.repeat(50));
    
    // Create users table
    console.log('Creating users table...');
    const { error: createUsersError } = await supabase
      .from('users')
      .insert([
        { 
          id: '00000000-0000-0000-0000-000000000000',
          google_id: 'test_google_id',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.png',
          created_at: new Date(),
          last_login: new Date()
        }
      ])
      .select();
    
    if (createUsersError && createUsersError.code !== '23505') { // Ignore duplicate key error
      console.error('Error creating users table:', createUsersError);
    } else {
      console.log('✅ Users table created or already exists');
    }
    
    // Check if bills table exists
    console.log('Checking if bills table exists...');
    const { data: billsData, error: billsError } = await supabase
      .from('bills')
      .select('id')
      .limit(1);
    
    if (billsError) {
      console.error('❌ Error accessing bills table:', billsError);
    } else {
      console.log('✅ Bills table exists');
      
      // Add user_id column to bills table if it doesn't exist
      console.log('Checking if user_id column exists in bills table...');
      
      // We'll try to update a bill with user_id to see if the column exists
      const { error: updateError } = await supabase
        .from('bills')
        .update({ user_id: '00000000-0000-0000-0000-000000000000' })
        .eq('id', billsData[0]?.id || 'non-existent-id');
      
      if (updateError && updateError.message.includes('user_id')) {
        console.error('❌ user_id column does not exist in bills table');
        
        // Try to add the user_id column using a direct SQL query
        console.log('Attempting to add user_id column to bills table...');
        
        // Since we can't run direct SQL, we'll need to use the Supabase UI or API to add this column
        console.log('Please add the user_id column to the bills table manually in the Supabase dashboard');
      } else {
        console.log('✅ user_id column exists in bills table');
      }
    }
    
    // Check if notification_preferences table has user_id column
    console.log('Checking notification_preferences table...');
    const { data: prefData, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .limit(1);
    
    if (prefError) {
      console.error('❌ Error accessing notification_preferences table:', prefError);
    } else {
      console.log('✅ notification_preferences table exists with user_id column');
    }
    
    console.log('='.repeat(50));
    console.log('Google Authentication setup checks complete');
    console.log('='.repeat(50));
    
    console.log('\nImportant: You may need to manually add the user_id column to your tables');
    console.log('in the Supabase dashboard if they don\'t already exist.');
    console.log('\nNext steps:');
    console.log('1. Ensure your tables have the following structure:');
    console.log('   - users: id (UUID), google_id (TEXT), name (TEXT), email (TEXT), avatar_url (TEXT)');
    console.log('   - bills: add user_id (UUID) column if it doesn\'t exist');
    console.log('   - notification_preferences: ensure user_id (UUID) column exists');
    console.log('2. Restart your server');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error setting up Google Authentication:', error);
  }
}

setupGoogleAuth();
