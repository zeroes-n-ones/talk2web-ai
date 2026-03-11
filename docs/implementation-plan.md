# Implementation Plan: talk2web-ai

## Phase 1 — Extension Foundation
**Objective**: Establish basic Chrome extension structure and manifest

**Files to implement**:
- `extension/manifest.json` - Chrome extension manifest (Manifest V3)
- `extension/background/background.js` - Basic service worker setup
- `frontend/index.html` - Basic popup HTML structure
- `frontend/src/main.jsx` - React app entry point
- `frontend/src/App.jsx` - Basic app component
- `frontend/vite.config.js` - Vite configuration for extension build

**Dependencies**: None (foundation phase)

**Testing checkpoint**: Extension loads successfully in Chrome Developer Mode with popup UI visible

---

## Phase 2 — Article Extraction
**Objective**: Implement content script to extract article text from webpages

**Files to implement**:
- `extension/content/content.js` - Content script with Readability.js integration
- `extension/utils/articleExtractor.js` - Article extraction utilities
- `extension/messaging/messageHandler.js` - Message passing between components

**Dependencies**: Phase 1 (extension foundation)

**Testing checkpoint**: Content script successfully extracts clean article text from news/blog pages

---

## Phase 3 — Voice Input System
**Objective**: Implement speech-to-text functionality and voice UI controls

**Files to implement**:
- `frontend/src/components/MicButton.jsx` - Microphone activation button
- `frontend/src/components/VoiceStatus.jsx` - Voice status indicators
- `frontend/src/hooks/useVoiceRecognition.js` - Web Speech API integration
- `frontend/src/services/extensionApi.js` - Extension communication service

**Dependencies**: Phase 1 (extension foundation)

**Testing checkpoint**: Voice recognition captures speech and converts to text accurately

---

## Phase 4 — Backend API Foundation
**Objective**: Set up FastAPI backend with basic query endpoint

**Files to implement**:
- `backend/app/main.py` - FastAPI application setup
- `backend/app/routers/query_router.py` - Query endpoint definition
- `backend/requirements.txt` - Python dependencies
- `backend/.env` - Environment configuration

**Dependencies**: None (can be developed in parallel with early phases)

**Testing checkpoint**: Backend server runs and responds to basic POST /query requests

---

## Phase 5 — AI Integration Layer
**Objective**: Implement LLM service and prompt building logic

**Files to implement**:
- `backend/app/services/llm_service.py` - LLM API integration
- `backend/app/tools/summarize_tool.py` - Summarization logic
- `backend/app/tools/qa_tool.py` - Question answering logic
- `backend/app/utils/prompt_builder.py` - Prompt construction utilities

**Dependencies**: Phase 4 (backend API foundation)

**Testing checkpoint**: Backend generates contextually relevant AI responses

---

## Phase 6 — Voice Response System
**Objective**: Implement text-to-speech and response display

**Files to implement**:
- `frontend/src/components/ResponsePanel.jsx` - AI response display component
- Complete `frontend/src/hooks/useVoiceRecognition.js` - Add TTS functionality
- Complete `extension/background/background.js` - Handle backend communication

**Dependencies**: Phase 3 (voice input), Phase 5 (AI integration)

**Testing checkpoint**: System provides both text and voice responses to user queries

---

## Phase 7 — End-to-End Integration
**Objective**: Connect all components and implement full user flow

**Files to implement**:
- Complete all component integrations
- Add error handling and edge cases
- Implement keyboard shortcuts
- Add context management for conversations

**Dependencies**: All previous phases

**Testing checkpoint**: Complete user workflow works end-to-end:
1. User opens webpage with article content
2. User activates voice input via microphone button or keyboard shortcut
3. User speaks command (summarize/ask question)
4. System processes request and returns AI response
5. Response displayed as text and spoken aloud

---

## Communication Architecture

### Component Communication Flow:
1. **Frontend ↔ Background Script**: Chrome extension messaging API
2. **Background Script ↔ Content Script**: Chrome tabs.sendMessage API
3. **Background Script ↔ Backend**: HTTP POST requests to /query endpoint
4. **Backend ↔ LLM Provider**: External API calls

### Data Flow:
- Voice input → Speech-to-text → Extension UI → Background script → Backend → LLM → Backend → Extension UI → Text-to-speech

### Context Management:
- Session state maintained in background script
- Context cleared on page navigation/reload
- Language detection and response matching

---

## Development Dependencies

**Parallel Development Opportunities**:
- Phase 1 (Extension) + Phase 4 (Backend) can be developed simultaneously
- Phase 2 (Content Extraction) + Phase 3 (Voice Input) can overlap

**Critical Path**:
Phase 1 → Phase 2 → Phase 3 → Phase 6 → Phase 7
Phase 4 → Phase 5 → Phase 6 → Phase 7

**Testing Strategy**:
- Unit tests for individual components
- Integration tests for communication layers
- End-to-end tests for complete user workflows
- Performance testing for latency requirements (< 10 seconds)

This implementation plan follows the architecture defined in the PRD and TRD while ensuring logical development progression and clear testing checkpoints at each phase.
