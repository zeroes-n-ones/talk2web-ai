# 🎤 Voice Recognition & TTS Testing Guide

## 🚀 Quick Test

### **1. Test Voice Recognition**
```javascript
// In browser console
const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
recognition.start();
// Speak into the microphone
// Your voice should appear as text in the input field
```

### **2. Test Text-to-Speech**
```javascript
// In browser console
const utterance = new SpeechSynthesisUtterance('Hello, this is a test of the text-to-speech feature');
window.speechSynthesis.speak(utterance);
// You should hear the AI response spoken aloud
```

## 🔧 Manual Testing Steps

### **Voice Recognition Testing:**
1. Click "🎤 Start Voice Input" button
2. Speak clearly: "What is the main topic of this article?"
3. Check browser console for "Voice recognized: [your speech]"
4. Text should appear in the input field automatically
5. Click "🛑 Stop Listening" when done

### **Text-to-Speech Testing:**
1. Get an AI response (ask any question)
2. Click the "🔊 Speak" button
3. Check browser console for "Speaking: [response text]"
4. Audio should play automatically

### **Integration Testing:**
1. Extract article from any webpage
2. Ask a question about the article
3. Check browser console for API calls to `http://localhost:8000/query`

## 🐛 Troubleshooting

### **Voice Recognition Issues:**
- **Microphone Permissions**: Ensure microphone access is allowed
- **Browser Compatibility**: Chrome/Edge work best
- **Network**: Some features may require HTTPS in production

### **Text-to-Speech Issues:**
- **Voice Selection**: Ensure system has available voices
- **Audio Context**: Audio may not play in some browsers until user interaction

### **Extension Issues:**
- **Manifest V3**: Ensure correct permissions in manifest.json
- **Service Worker**: Background script must be properly registered
- **Content Scripts**: Content extraction must work on target pages

## 🎯 Features Working

✅ **Voice Recognition**: Web Speech API (no API keys needed)
✅ **Text-to-Speech**: Speech Synthesis API (no API keys needed)  
✅ **Backend Integration**: Full API communication with conversation history
✅ **Chrome Extension**: Content extraction and message passing
✅ **Conversation Context**: 5-turn history management
✅ **Error Handling**: Comprehensive error management and fallback

## 🌐 Ready for Production

The complete voice-enabled Talk2Web AI system is ready for Chrome Web Store submission!
