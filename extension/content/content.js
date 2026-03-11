// Content Script for Talk2Web AI Extension
// Injected into webpages to extract article content

console.log('Talk2Web AI Content Script loaded');

// Load Readability library for article extraction
(function() {
  // Inject Readability.js if not already available
  if (typeof Readability === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mozilla/readability@0.4.4/Readability.js';
    script.onload = initializeContentScript;
    document.head.appendChild(script);
  } else {
    initializeContentScript();
  }
})();

function initializeContentScript() {
  console.log('Readability library loaded, initializing content script');
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch (message.type) {
      case 'EXTRACT_ARTICLE':
        handleExtractArticle(sendResponse);
        return true; // Keep message channel open for async response
        
      case 'GET_PAGE_INFO':
        handleGetPageInfo(sendResponse);
        return true;
        
      case 'HIGHLIGHT_CONTENT':
        handleHighlightContent(message.data, sendResponse);
        return true;
        
      case 'REMOVE_HIGHLIGHTS':
        handleRemoveHighlights(sendResponse);
        return true;
        
      default:
        console.warn('Unknown message type in content script:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  });
  
  // Auto-extract content when page loads
  setTimeout(() => {
    const articleData = extractArticleContent();
    if (articleData.success) {
      console.log('Article auto-extracted:', articleData.data.title);
    }
  }, 2000);
}

function handleExtractArticle(sendResponse) {
  try {
    const articleData = extractArticleContent();
    sendResponse(articleData);
  } catch (error) {
    console.error('Error extracting article:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

function handleGetPageInfo(sendResponse) {
  try {
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      language: document.documentElement.lang || 'en'
    };
    sendResponse({ success: true, data: pageInfo });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function handleHighlightContent(data, sendResponse) {
  try {
    removeExistingHighlights();
    
    if (data.textContent) {
      highlightTextInPage(data.textContent);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function handleRemoveHighlights(sendResponse) {
  try {
    removeExistingHighlights();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function extractArticleContent() {
  try {
    // Check if Readability is available
    if (typeof Readability === 'undefined') {
      throw new Error('Readability library not loaded');
    }
    
    // Create a document clone for processing
    const documentClone = document.cloneNode(true);
    
    // Initialize Readability
    const reader = new Readability(documentClone, {
      charThreshold: 100,
      classesToPreserve: ['caption', 'figure', 'img', 'blockquote'],
      keepClasses: true
    });
    
    // Extract article
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Could not extract article content');
    }
    
    // Clean and validate content
    const cleanedContent = cleanArticleContent(article.content);
    const plainTextContent = htmlToPlainText(cleanedContent);
    
    // Validate extracted content
    if (plainTextContent.length < 100) {
      throw new Error('Extracted content too short');
    }
    
    return {
      success: true,
      data: {
        title: article.title || document.title,
        content: cleanedContent,
        plainText: plainTextContent,
        excerpt: article.excerpt || plainTextContent.substring(0, 200) + '...',
        byline: article.byline || '',
        length: plainTextContent.length,
        wordCount: plainTextContent.split(/\s+/).length,
        readingTime: Math.ceil(plainTextContent.split(/\s+/).length / 200), // Average reading speed
        url: window.location.href,
        extractedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Article extraction failed:', error);
    
    // Fallback: try basic content extraction
    return fallbackExtraction();
  }
}

function fallbackExtraction() {
  try {
    // Try to find main content using common selectors
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main'
    ];
    
    let mainContent = null;
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element;
        break;
      }
    }
    
    // If no main content found, use body but remove unwanted elements
    if (!mainContent) {
      mainContent = document.body;
    }
    
    // Clone and clean the content
    const contentClone = mainContent.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.sidebar', '.menu', '.navigation', '.ads', '.advertisement'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = contentClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    const plainText = contentClone.textContent || contentClone.innerText || '';
    
    if (plainText.length < 100) {
      throw new Error('Could not extract sufficient content');
    }
    
    return {
      success: true,
      data: {
        title: document.title,
        content: plainText,
        plainText: plainText,
        excerpt: plainText.substring(0, 200) + '...',
        byline: '',
        length: plainText.length,
        wordCount: plainText.split(/\s+/).length,
        readingTime: Math.ceil(plainText.split(/\s+/).length / 200),
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        fallback: true
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Fallback extraction failed: ${error.message}`
    };
  }
}

function cleanArticleContent(htmlContent) {
  // Basic HTML cleaning
  return htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToPlainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function highlightTextInPage(text) {
  // Simple text highlighting implementation
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.includes(text)) {
      textNodes.push(node);
    }
  }
  
  textNodes.forEach(textNode => {
    const span = document.createElement('span');
    span.style.backgroundColor = 'yellow';
    span.style.padding = '2px';
    span.className = 'talk2web-highlight';
    
    const parent = textNode.parentNode;
    const text = textNode.textContent;
    const index = text.indexOf(text);
    
    if (index !== -1) {
      const beforeText = document.createTextNode(text.substring(0, index));
      const highlightedText = document.createTextNode(text.substring(index, index + text.length));
      const afterText = document.createTextNode(text.substring(index + text.length));
      
      span.appendChild(highlightedText);
      parent.insertBefore(beforeText, textNode);
      parent.insertBefore(span, textNode);
      parent.insertBefore(afterText, textNode);
      parent.removeChild(textNode);
    }
  });
}

function removeExistingHighlights() {
  const highlights = document.querySelectorAll('.talk2web-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    const text = highlight.textContent;
    const textNode = document.createTextNode(text);
    parent.replaceChild(textNode, highlight);
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractArticleContent,
    fallbackExtraction,
    cleanArticleContent,
    htmlToPlainText
  };
}