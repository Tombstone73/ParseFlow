# ParseFlow

ParseFlow is an intelligent email parsing and processing application built with Next.js. It automatically processes incoming emails, extracts structured data using AI, and organizes them by type (orders, estimates, etc.).

## Features

- **Email Processing**: Connect to IMAP servers to fetch and process emails
- **AI-Powered Parsing**: Extract structured data from emails using Google Gemini AI
- **Email Classification**: Automatically categorize emails (orders, estimates, other)
- **Rule Management**: Create whitelist/blacklist rules for email filtering
- **Real-time Monitoring**: View processing logs and email status
- **Attachment Handling**: Process and store email attachments

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key (for AI processing)
- Email account with IMAP access

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
4. Edit `.env.local` and add your API keys:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. **Email Setup**: Go to Settings → Connection tab and configure your IMAP settings
2. **AI Processing**: Configure your AI provider and parsing schema in Settings → AI & Parsing
3. **Rules**: Set up whitelist/blacklist rules in Settings → Rules tab
4. **Attachments**: Configure attachment storage in Settings → Attachments tab

### Production Deployment

For production deployment, ensure you:

1. Set up proper environment variables
2. Configure a persistent database (currently uses in-memory storage)
3. Set up proper email credentials and security
4. Configure attachment storage (local or cloud)

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components
- **AI**: Google Gemini API
- **Email**: IMAP integration
- **State Management**: React hooks with in-memory storage

## License

MIT License 
