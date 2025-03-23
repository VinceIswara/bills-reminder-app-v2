const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

// Create the regular client with anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Create the admin client with service role key
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client if no service key

// Add method to create service role client when needed
supabase.createServiceClient = () => {
  if (!supabaseServiceKey) {
    console.error('Missing Supabase service role key for admin operations');
    throw new Error('Missing service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Export both the regular client and the admin client
module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
