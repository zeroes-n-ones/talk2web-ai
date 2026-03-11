import React, { useState, useEffect } from 'react';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import './App.css';

// Voice API availability check
const isSpeechRecognitionAvailable = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

const isSpeechSynthesisAvailable = () => {
  return 'speechSynthesis' in window;
};

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [articleContent, setArticleContent] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use voice hooks
  const voiceRecognition = useVoiceRecognition();
  const textToSpeech = useTextToSpeech();

  useEffect(() => {
    // Initialize voice APIs
    if (isSpeechRecognitionAvailable()) {
      voiceRecognition.init();
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      // Event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        console.log('Voice recognition started');
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserQuery(transcript);
        console.log('Voice recognized:', transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
      };
    }
    
    if (isSpeechSynthesisAvailable()) {
      synthesisRef.current = window.speechSynthesis;
    }
    
    // Check if extension context is available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setIsLoaded(true);
      console.log('Talk2Web AI Extension loaded');
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ARTICLE_EXTRACTED') {
          setArticleContent(message.data.content || message.data.plainText);
          console.log('Article extracted:', message.data);
        } else if (message.type === 'BACKEND_RESPONSE') {
          setAiResponse(message.data.response);
          // Add to conversation history
          setConversationHistory(prev => {
            const newHistory = [
              ...prev,
              { role: 'user', content: userQuery },
              { role: 'assistant', content: message.data.response }
            ];
            // Keep only last 10 messages (5 turns)
            return newHistory.slice(-10);
          });
          console.log('AI Response:', message.data);
        }
      });
      
      // Listen for extension connection
      chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (response.success) {
          console.log('Extension connection established');
        }
      });
    }
  }, []);

  const handleExtractContent = async () => {
    try {
      setIsProcessing(true);
      
      // Send message to background script to extract content
      const response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_CONTENT'
      });
      
      if (response.success) {
        setArticleContent(response.data.content || response.data.plainText);
        console.log('Article extracted:', response.data);
      } else {
        console.error('Failed to extract article:', response.error);
      }
    } catch (error) {
      console.error('Error extracting content:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceInput = () => {
    voiceRecognition.startListening();
  };
  
  const stopVoiceInput = () => {
    voiceRecognition.stopListening();
  };

  const handleQuery = async () => {
    if (!userQuery.trim() || !articleContent) return;
    
    try {
      setIsProcessing(true);
      
      // Prepare conversation history (last 10 messages)
      const historyToSend = conversationHistory.slice(-10);
      
      // Send query to backend
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_text: articleContent,
          query: userQuery,
          history: historyToSend,
          language: 'auto'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAiResponse(result.response_text);
        // Update conversation history
        setConversationHistory(prev => {
          const newHistory = [
            ...prev,
            { role: 'user', content: userQuery },
            { role: 'assistant', content: result.response_text }
          ];
          return newHistory.slice(-10);
        });
        console.log('AI Response:', result);
      } else {
        console.error('Query failed:', result.error);
      }
    } catch (error) {
      console.error('Error processing query:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text) => {
    if (!isSpeechSynthesisAvailable() || !synthesisRef.current) {
      console.error('Speech synthesis not available');
      return;
    }
    
    try {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      synthesisRef.current.speak(utterance);
      console.log('Speaking:', text);
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setAiResponse('');
    setUserQuery('');
    console.log('Conversation cleared');
  };

  if (!isLoaded) {
    return (
      <div className="app">
        <div className="loading">
          <p>Loading Talk2Web AI...</p>
          <p>Initializing voice APIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Talk2Web AI</h1>
        <p>Voice-powered web content interaction</p>
        <div className="voice-status">
          {isSpeechRecognitionAvailable() ? '🎤 Voice Input: Available' : '🎤 Voice Input: Not Available'}
          {isSpeechSynthesisAvailable() ? '🔊 Voice Output: Available' : '🔊 Voice Output: Not Available'}
        </div>
      </header>
      
      <main className="app-main">
        <section className="content-section">
          <h2>Article Content</h2>
          <button 
            onClick={handleExtractContent}
            disabled={isProcessing}
            className="extract-btn"
          >
            {isProcessing ? 'Extracting...' : 'Extract Article'}
          </button>
          
          {articleContent && (
            <div className="content-preview">
              <h3>Content Preview</h3>
              <p>{articleContent.substring(0, 200)}...</p>
              <small>Word count: {articleContent.split(' ').length}</small>
            </div>
          )}
        </section>
        
        <section className="query-section">
          <h2>Ask AI</h2>
          
          <div className="input-controls">
            <div className="voice-controls">
              <button
                onClick={handleVoiceInput}
                disabled={!isSpeechRecognitionAvailable() || isListening}
                className={`voice-btn ${isListening ? 'listening' : ''}`}
              >
                {isListening ? '🛑 Stop Listening' : '🎤 Start Voice Input'}
              </button>
              
              {isListening && (
                <button
                  onClick={stopVoiceInput}
                  className="stop-voice-btn"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask a question about the article (e.g., 'Summarize this article') or use voice input"
              rows={3}
              disabled={isProcessing}
              className="query-input"
            />
            
            <div className="action-buttons">
              <button 
                onClick={handleQuery}
                disabled={isProcessing || !userQuery.trim() || !articleContent}
                className="query-btn"
              >
                {isProcessing ? 'Processing...' : 'Ask AI'}
              </button>
              
              <button
                onClick={clearConversation}
                className="clear-btn"
                title="Clear conversation history"
              >
                🗑️ Clear
              </button>
            </div>
          </div>
          
          {aiResponse && (
            <div className="ai-response">
              <div className="response-header">
                <h3>AI Response</h3>
                <button 
                  onClick={() => speakResponse(aiResponse)}
                  className="speak-btn"
                  title="Read response aloud"
                  disabled={!isSpeechSynthesisAvailable()}
                >
                  🔊 Speak
                </button>
              </div>
              <p>{aiResponse}</p>
            </div>
          )}
        </section>
        
        {conversationHistory.length > 0 && (
          <section className="history-section">
            <h3>Conversation History</h3>
            <div className="history-list">
              {conversationHistory.map((item, index) => (
                <div key={index} className={`history-item ${item.role}`}>
                  <div className="history-role">
                    {item.role === 'user' ? '👤 User' : '🤖 Assistant'}
                  </div>
                  <div className="history-content">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;