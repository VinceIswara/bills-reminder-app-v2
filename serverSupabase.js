// serverSupabase.js - Server-side Supabase client exports
const database = require('./config/database');

// Export the supabaseAdmin client for server-side operations
module.exports = {
  supabaseAdmin: database.supabaseAdmin
};

console.log('Server-side Supabase clients exported'); 