#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your API keys first."
    echo "You can copy the content from .env.example and fill in your actual keys."
    exit 1
fi

# Start the application in development mode
echo "Starting the Bill Reminder App..."
npm run dev:all
