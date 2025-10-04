# Environment Variables Setup

Create a `.env.local` file in the root directory of the project with the following variables:

```env
# Daily.co Configuration
# Get your Daily API key from: https://dashboard.daily.co/developers

# Server-side API key (recommended for production - not exposed to client)
DAILY_API_KEY=your_daily_api_key_here

# Client-side API key (for development only)
NEXT_PUBLIC_DAILY_API_KEY=your_daily_api_key_here

# Daily Room URL
# Create a room at: https://dashboard.daily.co/rooms
# Format: https://yourdomain.daily.co/your-room-name
NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/your-room-name

# DeepL API (for language detection and translation)
# Get your DeepL API key from: https://www.deepl.com/pro-api
DEEPL_API_KEY=your_deepl_api_key_here

# OpenAI API (for generating test student messages - optional)
# Get your OpenAI API key from: https://platform.openai.com/api-keys
OPENAI_HACKATHON_KEY=your_openai_api_key_here
```

## Getting Your Daily Credentials

### 1. Get Your Daily API Key
1. Go to [Daily.co Dashboard](https://dashboard.daily.co/developers)
2. Sign up or log in to your account
3. Navigate to the **Developers** section
4. Copy your API key

### 2. Create a Daily Room
1. Go to [Daily.co Rooms](https://dashboard.daily.co/rooms)
2. Click **Create Room**
3. Configure your room settings (or use defaults)
4. Copy the room URL (e.g., `https://yourdomain.daily.co/your-room-name`)

### 3. Add to .env.local
Create a file named `.env.local` in the project root and paste your credentials:

```env
# Use the same API key for both (for development)
DAILY_API_KEY=abc123yourkey456
NEXT_PUBLIC_DAILY_API_KEY=abc123yourkey456
NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/classroom-room
```

**Security Note**: In production, only use `DAILY_API_KEY` (without the `NEXT_PUBLIC_` prefix) to keep your API key secure on the server.

### 4. Restart Development Server
After creating `.env.local`, restart your development server:

```bash
npm run dev
```

## Enabling Transcription

**IMPORTANT**: Daily's real-time transcription is a pay-as-you-go feature that's available on all plans.

### Key Concepts

1. **Transcription Generation**: Live transcripts (closed captions) are generated during the meeting and broadcast to all participants
2. **Transcription Storage**: Optionally save transcripts to S3 in WebVTT format (requires `enable_transcription_storage: true`)
3. **Permissions**: Users need `canAdmin: 'transcription'` permission to start/stop transcription
   - Teachers automatically get this permission via meeting tokens
   - The app generates tokens with proper permissions when users join
   - See `/app/api/get-token/route.ts` for the implementation

### Method 1: Enable for Room via Dashboard

1. Go to [Daily.co Dashboard](https://dashboard.daily.co/)
2. Navigate to **Rooms**
3. Select your room or create a new one
4. Ensure the room is configured properly (transcription works by default for all rooms)

### Method 2: Enable via REST API (Easy Script)

We've included a helper script to enable transcription for your room:

```bash
# Make sure you have .env.local configured first
./scripts/enable-transcription.sh
```

### Method 3: Enable via REST API (Manual)

You can also enable transcription for specific rooms manually using the Daily REST API:

```bash
curl --request POST \
  --url https://api.daily.co/v1/rooms \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "your-room-name",
    "properties": {
      "enable_transcription": true,
      "enable_advanced_chat": true
    }
  }'
```

Or update an existing room:

```bash
curl --request POST \
  --url https://api.daily.co/v1/rooms/your-room-name \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "properties": {
      "enable_transcription": true
    }
  }'
```

### Troubleshooting Transcription

If you see transcription errors:

1. **Permission Denied** or **"must be transcription admin to start transcription"**: 
   - The user needs `canAdmin: 'transcription'` permission
   - **Solution**: The app now automatically generates meeting tokens with proper permissions:
     - Teachers join as room owners with transcription admin rights
     - Students join as regular participants
   - Make sure both `DAILY_API_KEY` and `NEXT_PUBLIC_DAILY_API_KEY` are set in `.env.local`

2. **Empty error object or generic errors**: 
   - Make sure you've joined the meeting before calling `startTranscription()`
   - Check that audio is enabled (transcription needs audio to work)
   - Verify your Daily API key is correctly configured

3. **Not receiving transcription-message events**:
   - Ensure you've enabled live captions in your room settings
   - Check that participants have their microphones enabled
   - Look for transcription-error events in the console

### Transcription Features
- **Real-time**: Live speech-to-text during meetings
- **Multi-participant**: Transcribes all or selected participants
- **Interim & Final**: Shows real-time interim transcripts, then final corrected versions
- **Participant Attribution**: Automatically identifies who's speaking
- **Pay-as-you-go**: Available on all Daily plans
- **Storage Options**: Save to Daily's S3 or your own bucket (WebVTT format)
- **Multi-instance**: Run multiple transcription instances in the same room

### Reference
For complete transcription documentation, see: https://docs.daily.co/guides/products/transcription

## Auto-Translation Setup

The chat interface uses **DeepL** for automatic language detection and translation in a single API call.

### DeepL API

#### 1. Get Your DeepL API Key
1. Go to [DeepL API](https://www.deepl.com/pro-api)
2. Sign up for a free or pro account
3. Navigate to your account settings
4. Copy your API key

#### 2. Add to .env.local
```env
DEEPL_API_KEY=your-deepl-api-key-here:fx
```

**Note**: Free API keys end with `:fx` and use the `api-free.deepl.com` endpoint. Pro keys use `api.deepl.com`.

### How Auto-Translation Works
- When users select their preferred language in the chat interface, incoming messages are automatically sent to DeepL
- DeepL detects the source language automatically and labels each message
- If the detected language differs from the user's preference, DeepL translates it in the same API call
- Language labels appear as purple badges next to sender names
- Translated messages appear in a blue highlighted box with the original text collapsible
- If the source and target languages match, no translation is shown
- Your own messages are not auto-translated

### Supported Languages
The system supports:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `zh` - Chinese
- `ja` - Japanese
- `ko` - Korean
- `ar` - Arabic
- `hi` - Hindi
- `pt` - Portuguese
- `ru` - Russian
- `it` - Italian

### Testing Auto-Translation
Use the test buttons in the chat interface to generate realistic student messages in different languages:
- **Test ES** - Generates a Spanish student message from "Maria"
- **Test FR** - Generates a French student message from "Pierre"
- **Test JA** - Generates a Japanese student message from "Yuki"
- **Test AR** - Generates an Arabic student message from "Ahmed"

Each test button uses OpenAI to generate varied, realistic student messages like:
- "Professor, I've got a question."
- "Sorry, I'm a little lost."
- "This makes perfect sense!"
- And many other natural classroom interactions

Messages are generated in the target language and will show a language label and auto-translate if your selected language is different.

**Note:** Test message generation requires the `OPENAI_HACKATHON_KEY` to be configured.

## Notes
- The `.env.local` file is git-ignored and will not be committed
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser
- Each user joining the same room URL will be in the same video call
- Transcription requires a Daily.co plan that supports this feature
- DeepL offers a free tier with 500,000 characters/month and includes built-in language detection
- OpenAI API key is optional - only needed for generating test messages in the chat interface

