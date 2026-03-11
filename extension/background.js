// Background script for Talk2Web AI Chrome Extension
// Handles article extraction and API communication

console.log('Talk2Web AI Background Script Loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'EXTRACT_CONTENT':
      handleExtractContent(message, sendResponse);
      break;
      
    case 'PING':
      sendResponse({ success: true, message: 'Extension connection established' });
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Extract article content from the current page
async function handleExtractContent(message, sendResponse) {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }
    
    // Execute content extraction script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-extractor.js']
    });
    
    if (results && results.length > 0) {
      const result = results[0];
      sendResponse({ 
        success: true, 
        data: {
          content: result.result,
          title: result.title,
          url: tab.url
        }
      });
    } else {
      sendResponse({ success: false, error: 'Failed to extract content' });
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    sendResponse({ success: false, error: error.message });
  }
}
