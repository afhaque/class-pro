# Transcription Permissions Fix

## The Problem

You were seeing the error: **"must be transcription admin to start transcription"**

This occurs because Daily requires users to have `canAdmin: 'transcription'` permission to start/stop transcription. By default, regular participants don't have this permission.

## The Solution

Implemented an automatic meeting token system that grants appropriate permissions based on user role:

### 1. Created API Route (`/app/api/get-token/route.ts`)

This server-side endpoint generates Daily meeting tokens with proper permissions:

- **Teachers**: Join as room owners with `canAdmin: ['transcription']` permission
- **Students**: Join as regular participants without admin rights

```typescript
// Teachers get transcription admin permission
{
  properties: {
    room_name: roomName,
    user_name: 'Teacher',
    is_owner: true,
    permissions: {
      canAdmin: ['transcription']
    }
  }
}
```

### 2. Updated Join Logic (`/app/page.tsx`)

Modified the call joining process to:
1. Request a meeting token from the API
2. Use that token when joining the call
3. Automatically grant transcription permissions to teachers

```typescript
// Get token with permissions
const { token } = await fetch('/api/get-token', {
  method: 'POST',
  body: JSON.stringify({ userType: 'teacher' })
});

// Join with token
await callObject.join({ url: roomUrl, token });
```

### 3. Updated Environment Variables

Added `DAILY_API_KEY` for server-side token generation:

```env
# Server-side API key (secure - not exposed to client)
DAILY_API_KEY=your_daily_api_key_here

# Client-side API key (for development fallback)
NEXT_PUBLIC_DAILY_API_KEY=your_daily_api_key_here
```

## How It Works

1. **User selects role** (Teacher/Student) in the UI
2. **App requests token** from `/api/get-token` with the role
3. **Server generates token** with appropriate permissions using Daily API
4. **User joins call** with the token
5. **Teachers can now start transcription** because they have admin permission

## Testing the Fix

1. **Set up environment variables**:
   ```bash
   # Add to .env.local
   DAILY_API_KEY=your_api_key
   NEXT_PUBLIC_DAILY_API_KEY=your_api_key
   NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/room
   ```

2. **Restart development server**:
   ```bash
   npm run dev
   ```

3. **Join as teacher**:
   - Open app
   - Make sure "Teacher" is selected (default)
   - Join the call

4. **Start transcription**:
   - Click "Transcript" tab
   - Click "Start Transcription"
   - Should work without permission errors!

## Alternative: Manual Token Generation

For testing, you can manually generate tokens:

```bash
# Generate a teacher token
node scripts/generate-token.js teacher

# Token is saved to .token-teacher.txt
```

## Security Notes

- **Production**: Only use `DAILY_API_KEY` (server-side only)
- **Development**: Can use `NEXT_PUBLIC_DAILY_API_KEY` for convenience
- Never expose API keys in client-side code in production
- Meeting tokens expire (default: 1 hour) and are safer to use

## Documentation Updates

Updated the following files:
- ✅ `ENV_SETUP.md` - Added token system explanation
- ✅ `TRANSCRIPTION_FIXES.md` - Documented event structure fixes
- ✅ `scripts/README.md` - Added token generation script docs
- ✅ Created API route for automatic token generation

## Reference

- [Daily Meeting Tokens Documentation](https://docs.daily.co/reference/rest-api/meeting-tokens)
- [Daily Transcription Permissions](https://docs.daily.co/guides/products/transcription#setting-transcription-permissions)

