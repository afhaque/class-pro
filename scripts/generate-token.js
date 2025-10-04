#!/usr/bin/env node

/**
 * Generate a Daily meeting token with transcription admin permissions
 * Usage: node scripts/generate-token.js [teacher|student]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let DAILY_API_KEY = '';
let DAILY_ROOM_URL = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_DAILY_API_KEY=')) {
      DAILY_API_KEY = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_DAILY_ROOM_URL=')) {
      DAILY_ROOM_URL = line.split('=')[1].trim();
    }
  });
}

if (!DAILY_API_KEY || !DAILY_ROOM_URL) {
  console.error('Error: NEXT_PUBLIC_DAILY_API_KEY and NEXT_PUBLIC_DAILY_ROOM_URL must be set in .env.local');
  process.exit(1);
}

// Extract room name from URL
const roomName = DAILY_ROOM_URL.split('/').pop();
const userRole = process.argv[2] || 'teacher';
const isTeacher = userRole === 'teacher';

// Token configuration
const tokenData = JSON.stringify({
  properties: {
    room_name: roomName,
    user_name: isTeacher ? 'Teacher' : `Student ${Math.floor(Math.random() * 1000)}`,
    is_owner: isTeacher, // Teachers are owners
    enable_recording: 'local', // Allow local recording
    ...(isTeacher && {
      // Give teachers transcription admin permission
      permissions: {
        canAdmin: ['transcription']
      }
    })
  }
});

const options = {
  hostname: 'api.daily.co',
  port: 443,
  path: '/v1/meeting-tokens',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DAILY_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': tokenData.length
  }
};

console.log(`\nGenerating ${userRole} token for room: ${roomName}\n`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✓ Token generated successfully!\n');
      console.log('Token:', response.token);
      console.log('\nTo use this token, pass it when joining:');
      console.log(`callObject.join({ url: roomUrl, token: '${response.token}' });\n`);
      
      // Save to a file for easy access
      const tokenFile = path.join(__dirname, '..', `.token-${userRole}.txt`);
      fs.writeFileSync(tokenFile, response.token);
      console.log(`Token saved to: .token-${userRole}.txt\n`);
    } else {
      console.error('Error generating token:');
      console.error('Status:', res.statusCode);
      console.error('Response:', data);
      
      try {
        const errorData = JSON.parse(data);
        if (errorData.error) {
          console.error('\nError details:', errorData.error);
          console.error('Info:', errorData.info);
        }
      } catch (e) {
        // Response is not JSON
      }
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(tokenData);
req.end();

