#!/usr/bin/env node
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

// Required environment variables for Google OAuth
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

// Function to prompt for environment variables
async function promptForEnvVars() {
  const envVars = {};
  
  for (const varName of requiredEnvVars) {
    const value = await new Promise(resolve => {
      rl.question(`Enter value for ${varName}: `, answer => {
        resolve(answer.trim());
      });
    });
    
    envVars[varName] = value;
  }
  
  return envVars;
}

// Function to update or create .env file
function updateEnvFile(envVars) {
  let envContent = '';
  
  if (envExists) {
    // Read existing .env file
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add each environment variable
    for (const [key, value] of Object.entries(envVars)) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(envContent)) {
        // Update existing variable
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new variable
        envContent += `\n${key}=${value}`;
      }
    }
  } else {
    // Create new .env file
    for (const [key, value] of Object.entries(envVars)) {
      envContent += `${key}=${value}\n`;
    }
  }
  
  // Write to .env file
  fs.writeFileSync(envPath, envContent);
  console.log('.env file updated successfully');
}

// Function to run the database setup
function runDatabaseSetup() {
  console.log('Running database setup...');
  try {
    execSync('node setup-auth.js', { stdio: 'inherit' });
    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Error running database setup:', error.message);
    return false;
  }
}

// Function to install required dependencies
function installDependencies() {
  console.log('Installing required dependencies...');
  try {
    execSync('npm install passport passport-google-oauth20 express-session cookie-parser', { stdio: 'inherit' });
    console.log('Dependencies installed successfully');
    return true;
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('='.repeat(50));
  console.log('Bill Reminder App - Google Authentication Setup');
  console.log('='.repeat(50));
  
  // Check for missing environment variables
  const missingVars = [];
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  let envVars = {};
  if (missingVars.length > 0) {
    console.log(`The following environment variables are missing: ${missingVars.join(', ')}`);
    envVars = await promptForEnvVars();
    updateEnvFile(envVars);
  } else {
    console.log('All required environment variables are present');
  }
  
  // Install dependencies
  const dependenciesInstalled = installDependencies();
  if (!dependenciesInstalled) {
    console.error('Failed to install dependencies. Exiting...');
    rl.close();
    return;
  }
  
  // Run database setup
  const databaseSetupSuccessful = runDatabaseSetup();
  if (!databaseSetupSuccessful) {
    console.error('Failed to set up the database. Exiting...');
    rl.close();
    return;
  }
  
  console.log('='.repeat(50));
  console.log('Google Authentication Setup Completed Successfully');
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log('1. Restart your server');
  console.log('2. Navigate to http://localhost:5000/login to test the authentication');
  console.log('='.repeat(50));
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});
