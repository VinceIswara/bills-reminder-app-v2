#!/bin/bash

# This script will only update the PORT value in .env without modifying any API keys

# Check if .env file exists
if [ -f .env ]; then
  # Check if the file already contains the OpenAI API key
  if grep -q "OPENAI_API_KEY" .env; then
    echo "API keys appear to be present in .env file"
    # Just update the PORT if needed
    sed -i '' 's/PORT=5001/PORT=5002/g' .env
    echo "Updated PORT to 5002 in .env file"
  else
    # If API keys are missing, ask the user to check
    echo "WARNING: Your .env file may be missing API keys."
    echo "Please check your .env file and ensure it contains:"
    echo "- OPENAI_API_KEY"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_KEY"
    echo "- PORT=5002"
    echo "- NODE_ENV=development"
  fi
else
  echo "ERROR: .env file not found."
fi
