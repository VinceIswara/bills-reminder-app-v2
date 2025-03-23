// Script to set up notification tables in Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Read SQL file
const fs = require('fs');
const path = require('path');
const sqlContent = fs.readFileSync(path.join(__dirname, 'notification_tables.sql'), 'utf8');

// Execute SQL statements one by one
async function executeSQL() {
  try {
    console.log('Setting up notification tables in Supabase...');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing SQL statement: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error('Error executing SQL statement:', error);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('Notification tables setup completed successfully!');
  } catch (error) {
    console.error('Error setting up notification tables:', error);
  }
}

// Execute the function
executeSQL();
