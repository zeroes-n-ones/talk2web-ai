// Background Service Worker for Talk2Web AI Extension

// Extension state management
let extensionState = {
  isActive: false,
  currentTab: null,
  sessionContext: {},
  lastActivity: null
};

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Talk2Web AI Extension installed:', details);
  
  // Initialize default settings
  chrome.storage.local.set({
    settings: {
      language: 'auto', // auto-detect language
      voiceEnabled: true,
      contextRetention: true
    }
  });
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'GET_TAB_INFO':
      handleGetTabInfo(sender.tab?.id, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'EXTRACT_CONTENT':
      handleExtractContent(sender.tab?.id, sendResponse);
      return true;
      
    case 'SEND_TO_BACKEND':
      handleBackendRequest(message.data, sendResponse);
      return true;
      
    case 'UPDATE_CONTEXT':
      handleUpdateContext(message.data, sendResponse);
      return true;
      
    case 'CLEAR_CONTEXT':
      handleClearContext(sendResponse);
      return true;
      
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Handle tab updates to clear context when navigating
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Clear context when navigating to a new page
    clearTabContext(tabId);
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabContext(tabId);
});

// Helper functions
async function handleGetTabInfo(tabId, sendResponse) {
  try {
    const tab = await chrome.tabs.get(tabId);
    sendResponse({
      success: true,
      data: {
        id: tab.id,
        url: tab.url,
        title: tab.title
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExtractContent(tabId, sendResponse) {
  try {
    // Inject content script if not already injected
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    
    // Request content extraction
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_ARTICLE'
    });
    
    sendResponse(response);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleBackendRequest(data, sendResponse) {
  try {
    const response = await fetch('http://localhost:8000/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const result = await response.json();
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Backend request failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function handleUpdateContext(data, sendResponse) {
  const tabId = data.tabId || 'default';
  if (!extensionState.sessionContext[tabId]) {
    extensionState.sessionContext[tabId] = [];
  }
  
  extensionState.sessionContext[tabId].push({
    query: data.query,
    response: data.response,
    timestamp: Date.now()
  });
  
  sendResponse({ success: true });
}

function handleClearContext(sendResponse) {
  extensionState.sessionContext = {};
  sendResponse({ success: true });
}

function clearTabContext(tabId) {
  if (extensionState.sessionContext[tabId]) {
    delete extensionState.sessionContext[tabId];
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extensionState,
    handleGetTabInfo,
    handleExtractContent,
    handleBackendRequest,
    handleUpdateContext,
    handleClearContext
  };
}