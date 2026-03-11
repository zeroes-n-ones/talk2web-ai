// Content extraction script for Talk2Web AI Chrome Extension
// Extracts article text from web pages

(function() {
  'use strict';
  
  // Speech recognition setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chrome.runtime.sendMessage({ type: "voiceResult", text: transcript });
  };
  
  recognition.onerror = (event) => {
    chrome.runtime.sendMessage({ type: "voiceError", error: event.error });
  };
  
  // Make recognition available globally for popup access
  window.startVoiceRecognition = () => {
    try {
      recognition.start();
    } catch (error) {
      chrome.runtime.sendMessage({ type: "voiceError", error: error.message });
    }
  };
  
  // Extract article content using multiple methods
  function extractArticleContent() {
    let content = '';
    let title = '';
    
    // Method 1: Try to find main content area
    const mainContent = document.querySelector('main') || 
                         document.querySelector('article') || 
                         document.querySelector('[role="main"]') ||
                         document.querySelector('.content') ||
                         document.querySelector('#content');
    
    if (mainContent) {
      content = mainContent.innerText || mainContent.textContent || '';
      
      // Try to get title
      const titleElement = document.querySelector('h1') || 
                            document.querySelector('title') ||
                            document.querySelector('[property="og:title"]');
      title = titleElement ? (titleElement.innerText || titleElement.textContent || titleElement.content) : '';
    }
    
    // Method 2: If no main content found, try to get all text
    if (!content) {
      // Remove unwanted elements
      const unwantedSelectors = [
        'nav', 'header', 'footer', 'aside', 'sidebar',
        '.menu', '.toolbar', '.ads', '.advertisement',
        'script', 'style', '.social-media'
      ];
      
      unwantedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      // Get remaining text
      const bodyText = document.body.innerText || document.body.textContent;
      if (bodyText && bodyText.length > 100) {
        content = bodyText;
        
        // Try to get title from meta tags
        const metaTitle = document.querySelector('meta[property="og:title"]') ||
                           document.querySelector('meta[name="title"]');
        title = metaTitle ? (metaTitle.content || metaTitle.getAttribute('content')) : '';
      }
    }
    
    // Method 3: Clean up the content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')  // Replace multiple newlines with single newline
      .trim();
    
    // Return the extracted data
    return {
      content: content,
      title: title,
      url: window.location.href,
      wordCount: content.split(/\s+/).length
    };
  }
  
  // Check if this is a voice recognition call
  if (window.location.search.includes('voice=true')) {
    // This is a voice recognition call, don't extract content
    return;
  }
  
  // Send result back to background script
  const result = extractArticleContent();
  
  // Send result through chrome.runtime
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'CONTENT_EXTRACTED',
      data: result
    });
  } else {
    // Fallback for testing outside extension
    console.log('Article extracted (outside extension):', result);
    return result;
  }
})();
