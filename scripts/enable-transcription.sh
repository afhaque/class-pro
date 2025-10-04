#!/bin/bash

# Script to enable transcription for a Daily.co room
# Usage: ./scripts/enable-transcription.sh

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Check if API key is set
if [ -z "$NEXT_PUBLIC_DAILY_API_KEY" ]; then
    echo "Error: NEXT_PUBLIC_DAILY_API_KEY not found in .env.local"
    exit 1
fi

# Check if room URL is set
if [ -z "$NEXT_PUBLIC_DAILY_ROOM_URL" ]; then
    echo "Error: NEXT_PUBLIC_DAILY_ROOM_URL not found in .env.local"
    exit 1
fi

# Extract room name from URL (e.g., https://yourdomain.daily.co/room-name -> room-name)
ROOM_NAME=$(echo $NEXT_PUBLIC_DAILY_ROOM_URL | sed 's/.*\///')

echo "Enabling transcription for room: $ROOM_NAME"
echo ""

# Update room to enable transcription
RESPONSE=$(curl -s --request POST \
  --url "https://api.daily.co/v1/rooms/$ROOM_NAME" \
  --header "Authorization: Bearer $NEXT_PUBLIC_DAILY_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "properties": {
      "enable_transcription": true
    }
  }')

# Check if the request was successful
if echo "$RESPONSE" | grep -q "error"; then
    echo "Error enabling transcription:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "Common issues:"
    echo "1. Your Daily.co plan may not support transcription (requires Enterprise or Scale)"
    echo "2. The API key may not have the correct permissions"
    echo "3. The room name may be incorrect"
else
    echo "✓ Transcription enabled successfully!"
    echo ""
    echo "Room configuration:"
    echo "$RESPONSE" | jq '.properties' 2>/dev/null || echo "$RESPONSE"
fi

