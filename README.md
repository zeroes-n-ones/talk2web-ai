# Talk2Web AI

AI-powered voice assistant for web content interaction.

## Overview

Talk2Web AI is a Chrome browser extension that enables users to interact with web content using natural language. Instead of manually reading long articles, users can speak to a webpage and receive summaries or answers through synchronized voice and text responses.

## Features

- **Voice-driven webpage summarization**: Provides concise overviews of long-form content
- **Contextual question answering**: Allows users to ask specific questions based on webpage text
- **Multilingual responses**: Supports English and Hindi with automatic language detection
- **Chrome Manifest V3**: Fully compliant with modern Chrome extension standards

## Architecture

The system consists of three main components:

### Extension (Chrome Extension)
- **Background Script**: Service worker handling communication and state management
- **Content Script**: Article extraction using Readability.js
- **Popup UI**: React-based interface for user interaction
- **Message Handler**: Centralized communication between components

### Backend (FastAPI)
- **Query Router**: Handles summarization and Q&A requests
- **LLM Service**: Manages multiple AI providers (OpenAI, Anthropic, Mock)
- **Tools**: Specialized summarization and question answering modules
- **Prompt Builder**: Structured prompt generation for different query types

## Project Structure

```
talk2web-ai/
├── extension/          # Chrome extension files
│   ├── manifest.json
│   ├── background/
│   ├── content/
│   ├── messaging/
│   └── utils/
├── frontend/           # React popup UI
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # FastAPI backend
│   ├── app/
│   ├── requirements.txt
│   └── .env
└── docs/             # Documentation
    ├── PRD.md
    ├── TRD.md
    └── implementation-plan.md
```

## Development Setup

### Prerequisites
- Node.js 18+ for frontend development
- Python 3.8+ for backend development
- Chrome browser for extension testing

### Backend Setup
```bash
# Create virtual environment
python -m venv venv-git

# Activate and install dependencies
# Windows
.\venv-git\Scripts\activate
# Unix/Mac
source venv-git/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run development server
cd backend
python -m app.main
# or
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Extension Installation
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` directory

## Usage

1. Navigate to any webpage with article content
2. Click the Talk2Web AI extension icon
3. Click "Extract Article" to analyze the page
4. Type your query (e.g., "Summarize this article")
5. Click "Ask AI" to get the response
6. View the AI response in text format

## Configuration

### Environment Variables (Backend)
Create a `.env` file in the `backend` directory:

```env
# AI Provider Keys (at least one required)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional Settings
OPENAI_MODEL=gpt-3.5-turbo
ANTHROPIC_MODEL=claude-3-haiku-20240307
ENVIRONMENT=development
```

## API Endpoints

### Query Processing
- **POST** `/api/v1/query` - Process user queries against article content
- **GET** `/api/v1/query/types` - Get available query types and examples

### Health Check
- **GET** `/` - Basic health check
- **GET** `/health` - Detailed health status
- **GET** `/info` - Application information

## Development Phases

1. ✅ **Phase 1** - Extension Foundation
2. ✅ **Phase 2** - Article Extraction  
3. ⏳ **Phase 3** - Voice Input System
4. ✅ **Phase 4** - Backend API Foundation
5. ✅ **Phase 5** - AI Integration Layer
6. ⏳ **Phase 6** - Voice Response System
7. ⏳ **Phase 7** - End-to-End Testing

## Testing

### Backend Testing
```bash
# Health check
curl http://localhost:8000/health

# Query test
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "article_text": "Sample article content...",
    "query": "Summarize this article",
    "language": "en"
  }'
```

### Extension Testing
1. Load extension in Chrome Developer Mode
2. Navigate to a news article or blog post
3. Test article extraction
4. Test query processing
5. Verify AI responses

## Security Considerations

- AI API keys stored only on backend server
- Extension does not expose credentials
- Communication uses HTTPS
- Input validation and sanitization
- Rate limiting and abuse prevention

## Performance Targets

- **Response latency**: < 10 seconds end-to-end
- **Voice recognition accuracy**: ≥ 85% WER
- **Article extraction success**: ≥ 90% on major platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the [documentation](docs/)
- Review [implementation plan](docs/implementation-plan.md)
- Open an issue on the repository
