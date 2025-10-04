# ClassPro

A real-time multilingual classroom platform that breaks down language barriers in education. ClassPro enables teachers to conduct live video classes with automatic transcription, real-time translation, and student engagement analytics.

## Features

### 🎥 Video Communication
- **Live Video Calls**: Powered by Daily.co for high-quality, reliable video communication
- **Teacher & Student Views**: Role-based interfaces optimized for different user types
- **Scalable**: Support for multiple participants in a single classroom

### 📝 Real-Time Transcription
- **Live Speech-to-Text**: Automatic transcription of classroom discussions
- **Multi-Participant Support**: Identifies and transcribes different speakers
- **Interim & Final Transcripts**: Shows real-time captions with post-correction
- **Downloadable Transcripts**: Archive classroom sessions for later review

### 🌍 Multi-Language Translation
- **Automatic Language Detection**: Powered by DeepL API
- **Real-Time Translation**: Instant translation of chat messages and transcripts
- **12+ Languages Supported**: English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, Portuguese, Russian, Italian
- **Contextual Display**: Shows original text with translation side-by-side
- **User Language Preferences**: Each student can choose their preferred language

### 💬 Interactive Chat
- **Live Classroom Chat**: Text communication alongside video
- **Auto-Translation**: Messages automatically translated to each user's language
- **Persistent Storage**: Chat history saved locally
- **Language Labels**: Visual indicators showing message origin language
- **Test Message Generation**: Built-in tools for testing multi-language scenarios

### 📊 Pulse Analytics
- **Sentiment Analysis**: Track student engagement and comprehension in real-time
- **Confidence Logging**: Monitor student understanding throughout the session
- **ClickHouse Integration**: High-performance analytics storage
- **Real-Time Dashboard**: Visual feedback on class engagement

## Tech Stack

- **Framework**: Next.js 15 (with Turbopack)
- **Video**: Daily.co API
- **Translation**: DeepL API
- **Database**: ClickHouse (for analytics)
- **AI**: OpenAI API (for test data generation)
- **State Management**: Jotai
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or yarn package manager
- Daily.co account (free tier available)
- DeepL API key (free tier: 500k chars/month)
- (Optional) OpenAI API key for test message generation
- (Optional) ClickHouse instance for analytics

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd class-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local with your credentials
# See ENV_SETUP.md for detailed instructions
```

4. Configure your credentials in `.env.local`:
```env
# Daily.co Configuration
DAILY_API_KEY=your_daily_api_key
NEXT_PUBLIC_DAILY_API_KEY=your_daily_api_key
NEXT_PUBLIC_DAILY_ROOM_URL=https://yourdomain.daily.co/classroom

# DeepL Translation API
DEEPL_API_KEY=your_deepl_api_key

# Optional: OpenAI for test messages
OPENAI_HACKATHON_KEY=your_openai_api_key

# Optional: ClickHouse for analytics
CLICKHOUSE_HOST=your_clickhouse_host
CLICKHOUSE_USER=your_username
CLICKHOUSE_PASSWORD=your_password
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

## Detailed Setup

For comprehensive setup instructions including:
- Getting Daily.co API credentials
- Enabling transcription features
- Configuring DeepL translation
- Setting up ClickHouse analytics
- Troubleshooting common issues

See **[ENV_SETUP.md](./ENV_SETUP.md)**

## Project Structure

```
class-pro/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── get-token/    # Daily meeting token generation
│   │   ├── translate/    # Translation endpoints
│   │   ├── detect-language/
│   │   └── log-confidence/ # Analytics logging
│   ├── page.tsx          # Main application page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── VideoSection.tsx  # Video call interface
│   ├── ChatTab.tsx       # Chat with translation
│   ├── TranscriptTab.tsx # Live transcription
│   ├── PulseTab.tsx      # Analytics dashboard
│   ├── ControlPanel.tsx  # Teacher controls
│   └── Navbar.tsx        # Navigation
├── scripts/              # Utility scripts
│   ├── enable-transcription.sh
│   └── generate-token.js
└── public/               # Static assets
```

## Usage

### For Teachers
1. Join as a "Teacher" to access full controls
2. Enable live transcription with one click
3. Monitor student engagement via Pulse tab
4. View translated chat messages in real-time
5. Download transcripts after class

### For Students
1. Join as a "Student"
2. Select your preferred language
3. Participate in video call and chat
4. Receive automatic translations
5. View live transcripts in your language

## Key Features in Detail

### Transcription
- Automatically starts when teacher enables it
- Shows speaker attribution (who said what)
- Displays interim captions that update in real-time
- Final transcripts are corrected for accuracy
- Can be exported for review

### Translation
- Works on both chat messages and transcripts
- Single API call for detection + translation
- No translation shown if languages match
- Original text always preserved
- Visual indicators for translated content

### Analytics
- Real-time sentiment tracking
- Confidence level logging
- Engagement metrics
- Stored in ClickHouse for fast queries
- Visualized in Pulse dashboard

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check ENV_SETUP.md for troubleshooting
- Review Daily.co documentation for video features
- Consult DeepL API docs for translation questions

## Acknowledgments

- Daily.co for video infrastructure
- DeepL for translation services
- Next.js team for the excellent framework
- ClickHouse for analytics capabilities