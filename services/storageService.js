// services/storageService.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/database');

// Helper function to convert a stream to a buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

/**
 * Upload a file to both local storage and Supabase Storage
 * @param {Object} file - The file object from multer
 * @param {string} userId - The user ID
 * @param {string} authToken - The user's authentication token
 * @param {Object} req - The request object (optional, for accessing session)
 * @returns {Promise<Object>} The upload result
 */
const uploadFile = async (file, userId, authToken = null, req = null) => {
  try {
    // Local path is already set by multer
    const localPath = `/uploads/${path.basename(file.path)}`;
    console.log(`Local path for file: ${localPath}`);
    
    // Upload to Supabase Storage
    console.log(`Attempting to upload to Supabase Storage for user: ${userId}`);
    const fileName = path.basename(file.path);
    
    // For testing purposes, we'll use a public folder that doesn't require authentication
    // In production, we'd use the user-specific path
    let filePath;
    let supabaseClient = supabase;
    
    if (userId.startsWith('test-user')) {
      // For test users, use a public test folder and the service role key
      filePath = `public-test/${fileName}`;
      console.log(`Using public test path for test user: ${filePath}`);
      
      // Use service role key for test users to bypass RLS
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
      
      // Log key information for debugging (safely)
      console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL}`);
      console.log(`Using service role key: ${serviceRoleKey ? 'Yes (defined)' : 'No (undefined)'}`);
      
      if (!serviceRoleKey) {
        console.error('Service role key is not defined. This will likely cause permission issues.');
        return {
          success: false,
          error: {
            message: 'Service role key is not defined',
            code: 'AUTH_ERROR'
          }
        };
      }
      
      try {
        supabaseClient = createClient(
          process.env.SUPABASE_URL,
          serviceRoleKey
        );
        console.log('Created Supabase client with service role key');
      } catch (clientError) {
        console.error('Error creating Supabase client:', clientError);
        return {
          success: false,
          error: {
            message: 'Failed to create Supabase client',
            originalError: clientError.message
          }
        };
      }
    } else {
      // For real users, use the user-specific path
      filePath = `bills/${userId}/${fileName}`;
      console.log(`Using user-specific path: ${filePath}`);
      
      // Check for auth token in different sources with priority order:
      // 1. Explicitly provided authToken parameter
      // 2. Session supabaseToken (if req is provided)
      // 3. Request headers (if req is provided)
      // 4. Default to standard Supabase client
      let supabaseToken = authToken;
      
      // If no explicit token but we have a request object, check the session and headers
      if (!supabaseToken && req) {
        console.log('Checking request object for session token');
        console.log('Request session available:', req.session ? 'Yes' : 'No');
        
        if (req.session) {
          console.log('Session keys:', Object.keys(req.session));
          console.log('Supabase token in session:', req.session.supabaseToken ? 'Yes' : 'No');
          
          if (req.session.supabaseToken) {
            supabaseToken = req.session.supabaseToken;
            console.log('Using Supabase token from session (length):', req.session.supabaseToken.length);
            console.log('Token preview (first 10 chars):', req.session.supabaseToken.substring(0, 10) + '...');
          } else {
            console.log('No Supabase token found in session');
          }
        } else {
          console.log('No session available in request object');
        }
        
        // If still no token, check headers
        if (!supabaseToken && req.headers && req.headers.authorization) {
          console.log('Checking authorization header');
          const authHeader = req.headers.authorization;
          if (authHeader.startsWith('Bearer ')) {
            supabaseToken = authHeader.substring(7);
            console.log('Using Supabase token from Authorization header (length):', supabaseToken.length);
            console.log('Token preview (first 10 chars):', supabaseToken.substring(0, 10) + '...');
          } else {
            console.log('Authorization header does not contain a Bearer token');
          }
        }
      } else if (supabaseToken) {
        console.log('Using explicitly provided auth token (length):', supabaseToken.length);
        console.log('Token preview (first 10 chars):', supabaseToken.substring(0, 10) + '...');
      } else {
        console.log('No auth token provided, using standard Supabase client');
      }
      
      // If we have an auth token, create a new client with the token
      if (supabaseToken) {
        try {
          console.log('Creating Supabase client with user auth token');
          supabaseClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${supabaseToken}`
                }
              }
            }
          );
        } catch (authClientError) {
          console.error('Error creating authenticated Supabase client:', authClientError);
        }
      } else {
        console.log('No auth token provided, using standard Supabase client');
      }
      
      // Check if we have a valid user ID
      if (!userId || userId === 'undefined') {
        console.error('Invalid user ID provided for file upload');
        return {
          success: false,
          error: {
            message: 'Invalid user ID provided for file upload',
            code: 'AUTH_ERROR'
          }
        };
      }
      
      // Log the user ID format for debugging
      console.log(`User ID format: ${userId} (length: ${userId.length})`);
      
      // Check if user ID matches UUID format (for Supabase)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.warn(`User ID ${userId} does not match UUID format. This might cause RLS policy issues.`);
      }
      
      // For diagnostic purposes, try to get the user's auth status
      try {
        const { data: user, error: userError } = await supabaseClient.auth.getUser();
        if (userError) {
          console.warn(`Auth check error: ${userError.message}`);
        } else if (!user || !user.user) {
          console.warn('No authenticated user found in Supabase client');
        } else {
          console.log(`Authenticated as user: ${user.user.id}`);
          // Check if the user ID matches the one we're using
          if (user.user.id !== userId) {
            console.warn(`Auth mismatch: Using userId ${userId} but authenticated as ${user.user.id}`);
          }
        }
      } catch (authError) {
        console.warn(`Could not check auth status: ${authError.message}`);
      }
    }
    
    console.log(`Uploading file to Supabase Storage: ${filePath}`);
    
    // First check if the bucket exists
    if (userId.startsWith('test-user')) {
      // Only do this check for test users to avoid unnecessary API calls
      const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        return {
          success: false,
          error: {
            message: 'Failed to list buckets',
            originalError: bucketsError
          }
        };
      }
      
      const billImagesBucket = buckets.find(bucket => bucket.name === 'bill-images');
      if (!billImagesBucket) {
        console.error('bill-images bucket does not exist');
        return {
          success: false,
          error: {
            message: 'bill-images bucket does not exist',
            code: 'BUCKET_NOT_FOUND'
          }
        };
      }
    }
    
    // For regular users, we should ensure the user directory exists
    if (!userId.startsWith('test-user')) {
      try {
        // Try to list the user's directory to see if it exists
        const { data: userDir, error: userDirError } = await supabaseClient.storage
          .from('bill-images')
          .list(`bills/${userId}`);
        
        // If there's an error but it's not a "not found" error, it's a problem
        if (userDirError && !userDirError.message.includes('not found')) {
          console.error(`Error checking user directory: ${userDirError.message}`);
          
          // If we get a permission error, try using the service role key as a fallback
          if (userDirError.message.includes('Permission denied') || 
              userDirError.message.includes('not authorized') || 
              userDirError.message.includes('access denied') ||
              userDirError.statusCode === 403) {
            
            console.log('Permission issue detected. Attempting to use service role key as fallback...');
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
            
            if (serviceRoleKey) {
              try {
                const adminClient = createClient(
                  process.env.SUPABASE_URL,
                  serviceRoleKey
                );
                
                console.log('Created admin client with service role key for fallback');
                
                // Use admin client for the rest of the operation
                supabaseClient = adminClient;
                
                // Try again with admin client
                const { data: adminDir, error: adminDirError } = await supabaseClient.storage
                  .from('bill-images')
                  .list(`bills/${userId}`);
                
                if (adminDirError) {
                  console.error(`Still error with admin client: ${adminDirError.message}`);
                } else {
                  console.log('Successfully accessed directory with admin client');
                }
              } catch (adminError) {
                console.error(`Error creating admin client: ${adminError.message}`);
              }
            }
          }
        }
        
        // If directory doesn't exist or is empty, that's fine - upload will create it
        console.log(`User directory check: ${userDir ? 'exists' : 'will be created'}`);
      } catch (dirError) {
        // Non-fatal error, just log it
        console.warn(`Could not check user directory: ${dirError.message}`);
      }
    }
    
    // Attempt to upload the file
    const uploadResult = await uploadToSupabase(file.path, fileName, userId, req);
    
    if (!uploadResult.success) {
      console.error(`Error uploading to Supabase Storage: ${uploadResult.error}`);
      return {
        success: false,
        localPath,
        error: uploadResult.error
      };
    }
    
    console.log(`Successfully uploaded to Supabase Storage: ${filePath}`);
    
    // Get the public URL
    const publicUrl = uploadResult.url;
    console.log(`Public URL: ${publicUrl}`);
    
    // For regular users, verify they can access their own file via RLS
    if (!userId.startsWith('test-user')) {
      try {
        // Try to list the user's directory to verify access
        const { data: userFiles, error: userFilesError } = await supabaseClient.storage
          .from('bill-images')
          .list(`bills/${userId}`);
        
        if (userFilesError) {
          console.warn(`User may have issues accessing their files: ${userFilesError.message}`);
          console.warn('This could indicate an RLS policy issue for authenticated users');
        } else {
          console.log(`User can access their directory with ${userFiles.length} files`);
        }
      } catch (accessError) {
        // Non-fatal error, just log it
        console.warn(`Could not verify user access: ${accessError.message}`);
      }
    }
    
    return {
      success: true,
      localPath,
      supabasePath: filePath,
      publicUrl
    };
  } catch (error) {
    console.error(`Unexpected error in uploadFile: ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    };
  }
};

// Function to upload file to Supabase Storage
const uploadToSupabase = async (filePath, fileName, userId, req = null) => {
  try {
    console.log(`Attempting to upload ${fileName} to Supabase for user ${userId}`);
    
    // Check for token in multiple places
    let supabaseToken = null;
    
    // 1. Check if token is in the request session
    if (req && req.session && req.session.supabaseToken) {
      console.log('Found Supabase token in session');
      supabaseToken = req.session.supabaseToken;
    } 
    // 2. Check if token is in the request headers
    else if (req && req.headers && req.headers.authorization) {
      console.log('Found Supabase token in headers');
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        supabaseToken = authHeader.substring(7);
      }
    }
    
    // Read the file directly instead of using streams
    // This is more reliable and compatible with various file types
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`File read successfully, size: ${fileBuffer.length} bytes`);
    
    // First attempt: Try with user's token if available
    if (supabaseToken) {
      console.log('Attempting upload with user authentication token');
      
      // Create a Supabase client with the user's token
      const userSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${supabaseToken}`
            }
          }
        }
      );
      
      try {
        const { data, error } = await userSupabase.storage
          .from('bill-images')
          .upload(`bills/${userId}/${fileName}`, fileBuffer, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/jpeg' // Assuming JPEG format, adjust if needed
          });
        
        if (error) {
          console.error('Error uploading with user token, will try fallback:', error.message);
          // Continue to fallback
        } else {
          console.log('Successfully uploaded file with user token:', data.path);
          
          // Get the public URL
          const { data: publicUrlData } = userSupabase.storage
            .from('bill-images')
            .getPublicUrl(`bills/${userId}/${fileName}`);
          
          return {
            success: true,
            path: data.path,
            url: publicUrlData.publicUrl
          };
        }
      } catch (userUploadError) {
        console.error('Exception during user token upload, will try fallback:', userUploadError.message);
        // Continue to fallback
      }
    } else {
      console.log('No user token available, will use service role fallback');
    }
    
    // Fallback: Use service role key for upload
    console.log('Using service role fallback for upload');
    
    // Create a Supabase client with the service role key
    const serviceSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await serviceSupabase.storage
      .from('bill-images')
      .upload(`bills/${userId}/${fileName}`, fileBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg' // Assuming JPEG format, adjust if needed
      });
    
    if (error) {
      console.error('Error uploading with service role key:', error.message);
      throw error;
    }
    
    console.log('Successfully uploaded file with service role key:', data.path);
    
    // Get the public URL
    const { data: publicUrlData } = serviceSupabase.storage
      .from('bill-images')
      .getPublicUrl(`bills/${userId}/${fileName}`);
    
    return {
      success: true,
      path: data.path,
      url: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('Error in uploadToSupabase:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Test the Supabase Storage connection
 * @returns {Promise<Object>} Result of the test
 */
const testSupabaseStorage = async () => {
  try {
    console.log('Testing Supabase Storage connection...');
    
    // Log the Supabase URL (without revealing the full key)
    const supabaseUrl = process.env.SUPABASE_URL;
    console.log('Supabase URL:', supabaseUrl);
    
    // Check if keys are defined
    if (!process.env.SUPABASE_KEY) {
      console.error('SUPABASE_KEY is not defined in environment variables');
      return {
        success: false,
        message: 'SUPABASE_KEY is not defined',
        error: { message: 'Missing SUPABASE_KEY environment variable' }
      };
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables, falling back to SUPABASE_KEY');
    }
    
    // For testing purposes, create a client with the service role key
    // This bypasses RLS policies
    console.log('Creating Supabase client with service role for testing...');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    
    // Log a masked version of the key for debugging (only first 4 chars)
    const maskedKey = serviceRoleKey ? `${serviceRoleKey.substring(0, 4)}...` : 'undefined';
    console.log('Using service role key (masked):', maskedKey);
    
    // Create the admin client
    try {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        serviceRoleKey
      );
      
      // Check if we can list buckets (requires admin privileges)
      console.log('Listing storage buckets...');
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage
        .listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        return {
          success: false,
          message: 'Failed to list buckets',
          error: bucketsError
        };
      }
      
      console.log('Buckets:', buckets);
      
      // Check if the bill-images bucket exists
      const billImagesBucket = buckets.find(bucket => bucket.name === 'bill-images');
      
      if (!billImagesBucket) {
        console.log('bill-images bucket not found, attempting to create it...');
        const { data: newBucket, error: createError } = await supabaseAdmin.storage
          .createBucket('bill-images', {
            public: true
          });
        
        if (createError) {
          console.error('Error creating bill-images bucket:', createError);
          return {
            success: false,
            message: 'Failed to create bill-images bucket',
            error: createError
          };
        }
        
        console.log('Created bill-images bucket:', newBucket);
      } else {
        console.log('bill-images bucket exists');
      }
      
      // Check if we can list files in the bucket
      console.log('Listing files in bill-images bucket...');
      const { data: files, error: filesError } = await supabaseAdmin.storage
        .from('bill-images')
        .list();
      
      if (filesError) {
        console.error('Error listing files in bill-images bucket:', filesError);
      } else {
        console.log('Files in bill-images bucket:', files);
      }
      
      // Check if the public-test folder exists, create it if not
      console.log('Checking public-test folder...');
      const { data: publicTestFiles, error: publicTestError } = await supabaseAdmin.storage
        .from('bill-images')
        .list('public-test');
      
      if (publicTestError) {
        console.error('Error checking public-test folder:', publicTestError);
        
        // Try to create a test file to establish the folder
        console.log('Creating test file in public-test folder...');
        const testContent = 'This is a test file to establish the public-test folder.';
        const { data: testFile, error: testFileError } = await supabaseAdmin.storage
          .from('bill-images')
          .upload('public-test/test-file.txt', testContent, {
            contentType: 'text/plain',
            upsert: true
          });
        
        if (testFileError) {
          console.error('Error creating test file:', testFileError);
        } else {
          console.log('Created test file:', testFile);
        }
      } else {
        console.log('public-test folder exists with files:', publicTestFiles);
      }
      
      // Get the public URL for the test file
      const { data: urlData } = supabaseAdmin.storage
        .from('bill-images')
        .getPublicUrl('public-test/test-file.txt');
      
      console.log('Public URL for test file:', urlData);
      
      // Check RLS policies
      console.log('Checking RLS policies...');
      // We can't directly check RLS policies via the API, but we can test if we can access the file
      // with a non-admin client
      const regularClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );
      
      const { data: publicAccess, error: publicAccessError } = await regularClient.storage
        .from('bill-images')
        .list('public-test');
      
      if (publicAccessError) {
        console.error('Error accessing public-test folder with regular client:', publicAccessError);
        console.log('This suggests RLS policies might be restricting access. You may need to update your RLS policies.');
      } else {
        console.log('Successfully accessed public-test folder with regular client:', publicAccess);
      }
      
      // Define testFile object based on the existing file or create a placeholder
      const testFile = {
        path: 'public-test/test-file.txt',
        id: 'test-file',
        fullPath: 'bill-images/public-test/test-file.txt'
      };
      
      return {
        success: true,
        message: 'Successfully tested Supabase Storage',
        testFile,
        publicUrl: urlData,
        buckets: buckets,
        files: files || [],
        publicTestFiles: publicTestFiles || [],
        rlsCheck: {
          success: !publicAccessError,
          files: publicAccess || []
        }
      };
    } catch (error) {
      console.error('Error creating Supabase admin client:', error);
      return {
        success: false,
        message: 'Failed to create Supabase admin client',
        error
      };
    }
  } catch (error) {
    console.error('Error testing Supabase Storage:', error);
    return {
      success: false,
      message: 'Error testing Supabase Storage',
      error
    };
  }
};

module.exports = {
  uploadFile,
  testSupabaseStorage
};