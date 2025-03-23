export const checkNetworkConnectivity = async () => {
  try {
    console.log('Checking network connectivity...');
    
    // Check basic internet connectivity
    const googleResponse = await fetch('https://www.google.com', { 
      mode: 'no-cors',
      cache: 'no-cache',
      timeout: 5000
    });
    console.log('Google connectivity:', googleResponse.type);
    
    // Check Supabase connectivity
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    if (supabaseUrl) {
      const supabaseResponse = await fetch(supabaseUrl, { 
        mode: 'no-cors',
        cache: 'no-cache',
        timeout: 5000
      });
      console.log('Supabase connectivity:', supabaseResponse.type);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Network check failed:', error);
    return { success: false, error: error.message };
  }
}; 