require('dotenv').config();
const fs = require('fs');
const path = require('path');
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
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_users_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('pgclient', { query: statement + ';' });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    // Check if users table was created
    const { data: usersTable, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (!usersError) {
      console.log('✅ Users table exists and is accessible');
    } else {
      console.error('❌ Error accessing users table:', usersError);
    }
    
    // Check if bills table has user_id column
    const { data: billsData, error: billsError } = await supabase
      .rpc('pgclient', { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'user_id';" 
      });
    
    if (!billsError && billsData && billsData.length > 0) {
      console.log('✅ Bills table has user_id column');
    } else {
      console.error('❌ Error checking user_id column in bills table:', billsError || 'Column not found');
    }
    
    console.log('='.repeat(50));
    console.log('Google Authentication setup complete');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Create a Google OAuth project at https://console.cloud.google.com/apis/credentials');
    console.log('2. Add the following environment variables to your .env file:');
    console.log('   GOOGLE_CLIENT_ID=your_client_id');
    console.log('   GOOGLE_CLIENT_SECRET=your_client_secret');
    console.log('   SESSION_SECRET=your_session_secret');
    console.log('3. Restart your server');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error setting up Google Authentication:', error);
  }
}

setupGoogleAuth();
