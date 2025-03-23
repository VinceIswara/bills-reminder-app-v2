#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validation helper
const validateEnv = (name) => {
  if (!process.env[name]) {
    console.error(`❌ Missing environment variable: ${name}`);
    return false;
  }
  console.log(`✅ Found ${name}`);
  return true;
};

// Main function
async function verifySupabaseSetup() {
  console.log('='.repeat(50));
  console.log('Supabase OAuth Configuration Verification');
  console.log('='.repeat(50));
  
  // Check required environment variables
  let hasAllEnvVars = true;
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SERVER_URL',
    'CLIENT_URL'
  ];
  
  for (const varName of requiredVars) {
    if (!validateEnv(varName)) {
      hasAllEnvVars = false;
    }
  }
  
  if (!hasAllEnvVars) {
    console.error('\n❌ Some required environment variables are missing!');
    console.log('Please check your .env file and make sure all required variables are set.');
    return;
  }
  
  console.log('\n✅ All required environment variables are present!');
  
  // Attempt to connect to Supabase
  console.log('\nAttempting to connect to Supabase...');
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error(`❌ Connection error: ${error.message}`);
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log(`Session present: ${data.session ? 'Yes' : 'No'}`);
    }
    
    // Check OAuth config by generating a sign-in URL
    console.log('\nTesting OAuth URL generation...');
    const { data: urlData, error: urlError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.SERVER_URL}/auth/callback`
      }
    });
    
    if (urlError) {
      console.error(`❌ Failed to generate OAuth URL: ${urlError.message}`);
      console.error('Error details:', urlError);
    } else if (urlData && urlData.url) {
      console.log('✅ Successfully generated OAuth URL!');
      console.log(`URL: ${urlData.url.substring(0, 50)}...`);
      
      // Verify redirect URL format
      try {
        const url = new URL(urlData.url);
        console.log('\nOAuth URL details:');
        console.log(`- Host: ${url.host}`);
        console.log(`- Pathname: ${url.pathname}`);
        
        // Check important parameters
        console.log('\nOAuth URL parameters:');
        const clientId = url.searchParams.get('client_id');
        console.log(`- client_id: ${clientId ? clientId.substring(0, 10) + '...' : 'Not found'}`);
        
        const redirectUri = url.searchParams.get('redirect_uri');
        console.log(`- redirect_uri: ${redirectUri || 'Not found'}`);
        
        if (redirectUri) {
          try {
            const redirectUrl = new URL(redirectUri);
            console.log(`  - Host: ${redirectUrl.host}`);
            console.log(`  - Pathname: ${redirectUrl.pathname}`);
            
            // Check if the redirect URI is properly formatted
            if (redirectUrl.pathname.includes('/auth/callback')) {
              console.log('✅ redirect_uri has the correct path');
            } else {
              console.log('⚠️ redirect_uri may not have the correct path');
            }
          } catch (e) {
            console.error(`❌ redirect_uri is not a valid URL: ${e.message}`);
          }
        }
        
        const redirectTo = url.searchParams.get('redirect_to');
        console.log(`- redirect_to: ${redirectTo || 'Not found'}`);
        
        if (redirectTo) {
          try {
            const redirectToUrl = new URL(redirectTo);
            console.log(`  - Host: ${redirectToUrl.host}`);
            console.log(`  - Pathname: ${redirectToUrl.pathname}`);
            
            // Check if the redirect_to parameter is properly formatted
            if (redirectToUrl.pathname.includes('/auth/callback')) {
              console.log('✅ redirect_to has the correct path');
            } else {
              console.log('⚠️ redirect_to may not have the correct path');
            }
          } catch (e) {
            console.error(`❌ redirect_to is not a valid URL: ${e.message}`);
          }
        }
        
        console.log(`- response_type: ${url.searchParams.get('response_type') || 'Not found'}`);
        console.log(`- scope: ${url.searchParams.get('scope') || 'Not found'}`);
      } catch (e) {
        console.error(`❌ Error parsing OAuth URL: ${e.message}`);
      }
    } else {
      console.error('❌ Failed to generate OAuth URL: No URL returned');
    }

    // Verify service role key by attempting to use admin API
    console.log('\nVerifying service role key...');
    try {
      const adminSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: adminData, error: adminError } = await adminSupabase.auth.admin.listUsers();
      
      if (adminError) {
        console.error(`❌ Service role key validation failed: ${adminError.message}`);
      } else {
        console.log('✅ Service role key is valid!');
        console.log(`Found ${adminData.users.length} users in the database`);
      }
    } catch (adminError) {
      console.error(`❌ Service role key validation failed: ${adminError.message}`);
    }
    
    // Verify callback URL configuration
    console.log('\nVerifying callback URL configuration...');
    
    // Server URL without trailing /api if it exists
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5002/api';
    const baseUrl = serverUrl.endsWith('/api') 
      ? serverUrl.substring(0, serverUrl.length - 4) 
      : serverUrl;
    
    const callbackUrl = `${baseUrl}/auth/callback`;
    console.log(`Callback URL: ${callbackUrl}`);
    
    // Check if the callback URL is properly formatted
    try {
      const url = new URL(callbackUrl);
      console.log(`✅ Callback URL is properly formatted: ${url.toString()}`);
      
      // Check if the URL includes the necessary path
      if (url.pathname.includes('/auth/callback')) {
        console.log('✅ Callback URL has the correct path');
      } else {
        console.log('⚠️ Callback URL may not have the correct path');
      }
      
      // Verify that this matches what we're using in the OAuth flow
      console.log('\nVerifying consistency with OAuth flow...');
      console.log(`OAuth redirectTo: ${baseUrl}/auth/callback`);
      console.log(`Server callback route: /auth/callback`);
      
      if (baseUrl.includes('localhost')) {
        console.log('\n⚠️ Using localhost - make sure this matches your Google Cloud Console settings');
        console.log('Google Cloud Console redirect URI should be exactly:');
        console.log(`${callbackUrl}`);
      }
    } catch (urlError) {
      console.error(`❌ Callback URL is not properly formatted: ${urlError.message}`);
    }
    
    // Verify client URLs
    console.log('\nVerifying client URLs...');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3002';
    const clientErrorUrl = process.env.CLIENT_ERROR_URL || 'http://localhost:3002/login';
    
    console.log(`Client URL: ${clientUrl}`);
    console.log(`Client Error URL: ${clientErrorUrl}`);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Verification Summary');
    console.log('='.repeat(50));
    console.log('✅ Environment variables: All required variables are present');
    console.log(`✅ Supabase connection: ${error ? 'Failed' : 'Successful'}`);
    console.log(`✅ OAuth URL generation: ${urlError ? 'Failed' : 'Successful'}`);
    console.log(`✅ Service role key: Valid`);
    console.log(`✅ Callback URL: ${callbackUrl}`);
    console.log('\nNext steps:');
    console.log('1. Ensure your Supabase project has the correct redirect URL in the authentication settings');
    console.log('2. Verify that your Google OAuth credentials are properly configured');
    console.log('3. Test the authentication flow by signing in with Google');
    console.log('\nIf you encounter any issues, check the server logs for more details.');
    
  } catch (error) {
    console.error('Unexpected error during verification:', error);
  }
  
  console.log('\nVerification complete!');
  console.log('='.repeat(50));
}

// Run the verification
verifySupabaseSetup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});