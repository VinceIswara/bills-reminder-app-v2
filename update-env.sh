#!/bin/bash

# Check if .env file exists
if [ -f .env ]; then
  # Update the PORT value to 5002
  sed -i '' 's/PORT=5001/PORT=5002/g' .env
  echo "Updated PORT to 5002 in .env file"
else
  # Create a new .env file with the required variables
  echo "# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=5002
NODE_ENV=development" > .env
  echo "Created new .env file with PORT=5002"
fi
