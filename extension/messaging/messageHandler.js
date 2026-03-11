// Message Handler for Talk2Web AI Extension
// Centralized communication between extension components

export class MessageHandler {
  constructor() {
    this.messageQueue = new Map();
    this.responseTimeout = 30000; // 30 seconds
    this.messageId = 0;
  }

  /**
   * Send message to background script
   * @param {Object} message - Message object
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise} Response from background script
   */
  async sendToBackground(message, timeout = this.responseTimeout) {
    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      const messageWithId = {
        ...message,
        id: messageId,
        timestamp: Date.now()
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error(`Message timeout: ${message.type}`));
      }, timeout);

      // Store the promise handlers
      this.messageQueue.set(messageId, {
        resolve,
        reject,
        timeoutId
      });

      try {
        chrome.runtime.sendMessage(messageWithId, (response) => {
          clearTimeout(timeoutId);
          this.messageQueue.delete(messageId);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        this.messageQueue.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Send message to content script
   * @param {number} tabId - Tab ID
   * @param {Object} message - Message object
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise} Response from content script
   */
  async sendToContent(tabId, message, timeout = this.responseTimeout) {
    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      const messageWithId = {
        ...message,
        id: messageId,
        timestamp: Date.now()
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error(`Content script message timeout: ${message.type}`));
      }, timeout);

      try {
        chrome.tabs.sendMessage(tabId, messageWithId, (response) => {
          clearTimeout(timeoutId);
          this.messageQueue.delete(messageId);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        this.messageQueue.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Get current active tab information
   * @returns {Promise} Tab information
   */
  async getCurrentTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (tabs.length === 0) {
          reject(new Error('No active tab found'));
        } else {
          resolve(tabs[0]);
        }
      });
    });
  }

  /**
   * Extract article content from current tab
   * @param {number} tabId - Tab ID (optional, will use active tab if not provided)
   * @returns {Promise} Extracted article data
   */
  async extractArticle(tabId = null) {
    try {
      if (!tabId) {
        const tab = await this.getCurrentTab();
        tabId = tab.id;
      }

      const response = await this.sendToBackground({
        type: 'EXTRACT_CONTENT'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract article');
      }

      return response.data;
    } catch (error) {
      console.error('Article extraction failed:', error);
      throw error;
    }
  }

  /**
   * Send query to backend
   * @param {Object} data - Query data
   * @returns {Promise} Backend response
   */
  async sendToBackend(data) {
    try {
      const response = await this.sendToBackground({
        type: 'SEND_TO_BACKEND',
        data: data
      });

      if (!response.success) {
        throw new Error(response.error || 'Backend request failed');
      }

      return response.data;
    } catch (error) {
      console.error('Backend request failed:', error);
      throw error;
    }
  }

  /**
   * Update conversation context
   * @param {Object} data - Context data
   * @returns {Promise} Update response
   */
  async updateContext(data) {
    try {
      const response = await this.sendToBackground({
        type: 'UPDATE_CONTEXT',
        data: data
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update context');
      }

      return response;
    } catch (error) {
      console.error('Context update failed:', error);
      throw error;
    }
  }

  /**
   * Clear conversation context
   * @returns {Promise} Clear response
   */
  async clearContext() {
    try {
      const response = await this.sendToBackground({
        type: 'CLEAR_CONTEXT'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to clear context');
      }

      return response;
    } catch (error) {
      console.error('Context clear failed:', error);
      throw error;
    }
  }

  /**
   * Get page information
   * @param {number} tabId - Tab ID (optional)
   * @returns {Promise} Page information
   */
  async getPageInfo(tabId = null) {
    try {
      if (!tabId) {
        const tab = await this.getCurrentTab();
        tabId = tab.id;
      }

      const response = await this.sendToContent(tabId, {
        type: 'GET_PAGE_INFO'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get page info');
      }

      return response.data;
    } catch (error) {
      console.error('Get page info failed:', error);
      throw error;
    }
  }

  /**
   * Highlight content in page
   * @param {Object} data - Highlight data
   * @param {number} tabId - Tab ID (optional)
   * @returns {Promise} Highlight response
   */
  async highlightContent(data, tabId = null) {
    try {
      if (!tabId) {
        const tab = await this.getCurrentTab();
        tabId = tab.id;
      }

      const response = await this.sendToContent(tabId, {
        type: 'HIGHLIGHT_CONTENT',
        data: data
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to highlight content');
      }

      return response;
    } catch (error) {
      console.error('Highlight content failed:', error);
      throw error;
    }
  }

  /**
   * Remove highlights from page
   * @param {number} tabId - Tab ID (optional)
   * @returns {Promise} Remove highlights response
   */
  async removeHighlights(tabId = null) {
    try {
      if (!tabId) {
        const tab = await this.getCurrentTab();
        tabId = tab.id;
      }

      const response = await this.sendToContent(tabId, {
        type: 'REMOVE_HIGHLIGHTS'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove highlights');
      }

      return response;
    } catch (error) {
      console.error('Remove highlights failed:', error);
      throw error;
    }
  }

  /**
   * Get extension settings
   * @returns {Promise} Extension settings
   */
  async getSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['settings'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result.settings || {
            language: 'auto',
            voiceEnabled: true,
            contextRetention: true
          });
        }
      });
    });
  }

  /**
   * Update extension settings
   * @param {Object} settings - New settings
   * @returns {Promise} Update response
   */
  async updateSettings(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Check if extension has required permissions
   * @returns {Promise} Permission status
   */
  async checkPermissions() {
    try {
      const hasActiveTab = await chrome.permissions.contains({
        permissions: ['activeTab']
      });
      
      const hasStorage = await chrome.permissions.contains({
        permissions: ['storage']
      });

      const hasScripting = await chrome.permissions.contains({
        permissions: ['scripting']
      });

      return {
        activeTab: hasActiveTab,
        storage: hasStorage,
        scripting: hasScripting,
        allGranted: hasActiveTab && hasStorage && hasScripting
      };
    } catch (error) {
      console.error('Permission check failed:', error);
      return {
        activeTab: false,
        storage: false,
        scripting: false,
        allGranted: false,
        error: error.message
      };
    }
  }

  /**
   * Request missing permissions
   * @returns {Promise} Permission request response
   */
  async requestPermissions() {
    try {
      const granted = await chrome.permissions.request({
        permissions: ['activeTab', 'storage', 'scripting']
      });

      return { success: granted };
    } catch (error) {
      console.error('Permission request failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up message queue
   */
  cleanup() {
    // Clear all pending messages
    this.messageQueue.forEach((handlers, messageId) => {
      clearTimeout(handlers.timeoutId);
      handlers.reject(new Error('Message handler cleanup'));
    });
    this.messageQueue.clear();
  }

  /**
   * Get message queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      pendingMessages: this.messageQueue.size,
      messageIds: Array.from(this.messageQueue.keys())
    };
  }
}

// Export singleton instance
export const messageHandler = new MessageHandler();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageHandler, messageHandler };
}