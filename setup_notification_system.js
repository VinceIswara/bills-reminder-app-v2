/**
 * Setup Notification System
 * 
 * This script helps set up the notification system tables in Supabase.
 * It reads the SQL from notification_tables.sql and executes it using the Supabase client.
 * 
 * Usage: node setup_notification_system.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'notification_tables.sql');
let sqlContent;

try {
  sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('Successfully read SQL file');
} catch (error) {
  console.error('Error reading SQL file:', error);
  process.exit(1);
}

// Split the SQL into individual statements
// This is a simple approach and may not work for all SQL statements
const sqlStatements = sqlContent
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0 && !statement.startsWith('--') && !statement.startsWith('/*'));

// Execute each SQL statement
async function executeSQL() {
  console.log(`Found ${sqlStatements.length} SQL statements to execute`);
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const statement = sqlStatements[i];
    console.log(`Executing statement ${i + 1}/${sqlStatements.length}...`);
    
    try {
      // Execute the SQL statement
      const { data, error } = await supabase.rpc('pgclient_execute', { 
        query: statement + ';' 
      });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        console.error('Statement:', statement);
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    } catch (error) {
      console.error(`Error executing statement ${i + 1}:`, error);
      console.error('Statement:', statement);
    }
  }
  
  console.log('SQL execution completed');
}

// Execute the SQL
executeSQL().catch(error => {
  console.error('Error executing SQL:', error);
});

// Note: This script requires the pgclient_execute RPC function to be available in your Supabase project.
// If you don't have this function, you'll need to execute the SQL statements manually in the Supabase SQL Editor.
