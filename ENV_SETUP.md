# Environment Variables Setup

Create a `.env.local` file in the root directory of the project with the following variables:

```env
# Daily.co Configuration
# Get your Daily API key from: https://dashboard.daily.co/developers
NEXT_PUBLIC_DAILY_API_KEY=your_daily_api_key_here

# Daily Room URL
# Create a room at: https://dashboard.daily.co/rooms
# Format: https://yourdomain.daily.co/your-room-name
NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/your-room-name
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
NEXT_PUBLIC_DAILY_API_KEY=abc123yourkey456
NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/classroom-room
```

### 4. Restart Development Server
After creating `.env.local`, restart your development server:

```bash
npm run dev
```

## Notes
- The `.env.local` file is git-ignored and will not be committed
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser
- Each user joining the same room URL will be in the same video call

