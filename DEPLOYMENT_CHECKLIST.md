# Video Deployment Checklist

## Environment Variables (CRITICAL)

Make sure these environment variables are set in your deployment platform:

### Required Variables
```env
# Daily.co Configuration
DAILY_API_KEY=your_daily_api_key_here
NEXT_PUBLIC_DAILY_API_KEY=your_daily_api_key_here
NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/your-room-name
```

### Optional Variables
```env
# DeepL Translation API
DEEPL_API_KEY=your_deepl_api_key_here

# OpenAI API (for test messages)
OPENAI_HACKATHON_KEY=your_openai_api_key_here
```

## Platform-Specific Setup

### Vercel
1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add all required variables
4. Redeploy your application

### Netlify
1. Go to Site settings → Environment variables
2. Add all required variables
3. Redeploy your site

### Railway/Render/Other Platforms
1. Find Environment Variables section in your dashboard
2. Add all required variables
3. Restart your application

## Daily.co Room Configuration

1. **Verify Room Exists**: Go to [Daily.co Dashboard](https://dashboard.daily.co/rooms)
2. **Check Room URL**: Make sure the URL in `NEXT_PUBLIC_DAILY_ROOM_URL` matches exactly
3. **Enable Transcription** (optional):
   ```bash
   # Run this script locally with your .env.local configured
   ./scripts/enable-transcription.sh
   ```

## Browser Requirements

- **HTTPS Required**: Video calling only works over HTTPS (except localhost)
- **Modern Browser**: Chrome, Firefox, Safari, Edge (latest versions)
- **Permissions**: Users must allow camera/microphone access

## Common Issues & Solutions

### 1. "Failed to connect to video call"
- Check if `NEXT_PUBLIC_DAILY_ROOM_URL` is set correctly
- Verify the Daily.co room exists and is accessible
- Check browser console for specific error messages

### 2. "Camera access denied"
- Ensure your site is served over HTTPS
- Check browser permissions for camera/microphone
- Try refreshing the page and allowing permissions

### 3. "Browser Not Supported"
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Ensure WebRTC is enabled in browser settings
- Check if you're on HTTPS

### 4. "Missing Daily API credentials"
- Verify `DAILY_API_KEY` is set in your deployment environment
- Check that the API key has proper permissions
- Test the API key with Daily.co's API directly

## Testing Your Deployment

1. **Check Environment Variables**:
   ```bash
   # Add this to your app temporarily to debug
   console.log('Room URL:', process.env.NEXT_PUBLIC_DAILY_ROOM_URL);
   ```

2. **Test API Endpoint**:
   ```bash
   curl -X POST https://your-domain.com/api/get-token \
     -H "Content-Type: application/json" \
     -d '{"userType": "teacher"}'
   ```

3. **Browser Console**: Check for any error messages when loading the page

## Security Notes

- Never commit `.env.local` to version control
- Use `DAILY_API_KEY` (server-side) instead of `NEXT_PUBLIC_DAILY_API_KEY` in production
- The `NEXT_PUBLIC_` prefix exposes variables to the browser

## Quick Debug Steps

1. Open browser developer tools (F12)
2. Check Console tab for error messages
3. Check Network tab for failed API calls
4. Verify environment variables are loaded
5. Test with a different browser/device
6. Check if the issue is specific to your deployment or affects all users

## Support

If issues persist:
1. Check Daily.co status page: https://status.daily.co/
2. Review Daily.co documentation: https://docs.daily.co/
3. Test with a simple Daily.co room URL directly

