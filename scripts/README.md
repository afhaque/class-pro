# Scripts

This directory contains helper scripts for setting up and configuring the ClassPro application.

## generate-token.js

Generates a Daily meeting token with transcription admin permissions for testing.

### Prerequisites

1. Configure `.env.local` with your Daily API key and room URL
2. Ensure you have Node.js installed

### Usage

```bash
# Generate a teacher token (with transcription admin rights)
node scripts/generate-token.js teacher

# Generate a student token (regular participant)
node scripts/generate-token.js student
```

The script will:
- Generate a meeting token with appropriate permissions
- Save it to `.token-teacher.txt` or `.token-student.txt`
- Display instructions for using the token

**Note**: In production, the app automatically generates tokens via the `/api/get-token` API route. This script is for testing and debugging purposes only.

## enable-transcription.sh

Enables transcription for your Daily.co room using the Daily REST API.

### Prerequisites

1. Configure `.env.local` with your Daily API key and room URL
2. Ensure you have `curl` and `jq` installed (jq is optional but recommended for pretty output)
3. Your Daily.co account must support transcription (Enterprise or Scale plan)

### Usage

```bash
./scripts/enable-transcription.sh
```

The script will:
- Read your Daily API key and room URL from `.env.local`
- Make an API call to enable transcription for your room
- Display the result and any errors

### Troubleshooting

If the script fails, check:
1. Your `.env.local` file exists and contains valid credentials
2. Your Daily.co plan supports transcription
3. Your API key has the correct permissions
4. The room URL is correct

### Manual Alternative

If you prefer to enable transcription manually, see the "Method 3" section in `ENV_SETUP.md`.

