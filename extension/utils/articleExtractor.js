// Article Extraction Utilities for Talk2Web AI
// Helper functions for content processing and validation

export class ArticleExtractor {
  constructor() {
    this.minContentLength = 100;
    this.maxContentLength = 50000;
    this.wordCountThreshold = 50;
  }

  /**
   * Validate extracted article content
   * @param {Object} articleData - Extracted article data
   * @returns {Object} Validation result
   */
  validateArticle(articleData) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if article data exists
    if (!articleData) {
      validation.isValid = false;
      validation.errors.push('No article data provided');
      return validation;
    }

    // Check content length
    if (!articleData.plainText || articleData.plainText.length < this.minContentLength) {
      validation.isValid = false;
      validation.errors.push(`Content too short: ${articleData.plainText?.length || 0} characters (minimum: ${this.minContentLength})`);
    }

    if (articleData.plainText && articleData.plainText.length > this.maxContentLength) {
      validation.warnings.push(`Content very long: ${articleData.plainText.length} characters (may impact performance)`);
    }

    // Check word count
    if (articleData.wordCount && articleData.wordCount < this.wordCountThreshold) {
      validation.isValid = false;
      validation.errors.push(`Insufficient word count: ${articleData.wordCount} (minimum: ${this.wordCountThreshold})`);
    }

    // Check title
    if (!articleData.title || articleData.title.trim().length < 3) {
      validation.warnings.push('Title missing or too short');
    }

    // Check URL
    if (!articleData.url || !this.isValidUrl(articleData.url)) {
      validation.warnings.push('Invalid or missing URL');
    }

    return validation;
  }

  /**
   * Sanitize article content for processing
   * @param {string} content - Raw content
   * @returns {string} Sanitized content
   */
  sanitizeContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    return content
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might cause issues
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Remove multiple consecutive newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  /**
   * Truncate content to maximum length
   * @param {string} content - Content to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated content
   */
  truncateContent(content, maxLength = 3000) {
    if (!content || content.length <= maxLength) {
      return content;
    }

    // Try to truncate at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Extract key information from article
   * @param {Object} articleData - Article data
   * @returns {Object} Key information
   */
  extractKeyInfo(articleData) {
    const info = {
      title: articleData.title || '',
      url: articleData.url || '',
      domain: this.extractDomain(articleData.url),
      author: articleData.byline || '',
      wordCount: articleData.wordCount || 0,
      readingTime: articleData.readingTime || 0,
      language: this.detectLanguage(articleData.plainText),
      contentType: this.detectContentType(articleData),
      publishedDate: this.extractPublishedDate(articleData),
      tags: this.extractTags(articleData),
      summary: articleData.excerpt || ''
    };

    return info;
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL
   * @returns {string} Domain
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * Detect content language
   * @param {string} text - Text content
   * @returns {string} Language code
   */
  detectLanguage(text) {
    if (!text || text.length < 50) {
      return 'en';
    }

    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const englishPattern = /^[a-zA-Z\s\d\.,!?;:'"()-]+$/;

    if (hindiPattern.test(text)) {
      return 'hi';
    } else if (englishPattern.test(text.substring(0, 200))) {
      return 'en';
    }

    return 'auto'; // Let backend handle detection
  }

  /**
   * Detect content type
   * @param {Object} articleData - Article data
   * @returns {string} Content type
   */
  detectContentType(articleData) {
    const url = articleData.url || '';
    const title = (articleData.title || '').toLowerCase();
    const content = (articleData.plainText || '').toLowerCase();

    // News article patterns
    if (url.includes('news') || url.includes('article') || 
        title.includes('news') || title.includes('report') ||
        content.includes('according to') || content.includes('reported')) {
      return 'news';
    }

    // Blog post patterns
    if (url.includes('blog') || url.includes('post') ||
        title.includes('blog') || title.includes('post') ||
        content.includes('i think') || content.includes('in my opinion')) {
      return 'blog';
    }

    // Documentation patterns
    if (url.includes('docs') || url.includes('documentation') ||
        title.includes('documentation') || title.includes('guide') ||
        content.includes('function') || content.includes('class') || content.includes('method')) {
      return 'documentation';
    }

    // Research paper patterns
    if (url.includes('research') || url.includes('paper') ||
        title.includes('study') || title.includes('research') ||
        content.includes('abstract') || content.includes('methodology')) {
      return 'research';
    }

    return 'article'; // Default
  }

  /**
   * Extract published date from article
   * @param {Object} articleData - Article data
   * @returns {string|null} Published date
   */
  extractPublishedDate(articleData) {
    // Try to extract date from content
    const content = articleData.plainText || '';
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      /\b(\d{4}-\d{2}-\d{2})\b/,
      /\b(\w+ \d{1,2}, \d{4})\b/
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract tags from article content
   * @param {Object} articleData - Article data
   * @returns {Array} Array of tags
   */
  extractTags(articleData) {
    const content = (articleData.plainText || '').toLowerCase();
    const title = (articleData.title || '').toLowerCase();
    const text = title + ' ' + content;

    // Common topic keywords
    const topicKeywords = {
      'technology': ['technology', 'tech', 'software', 'computer', 'digital', 'ai', 'artificial intelligence'],
      'business': ['business', 'economy', 'market', 'finance', 'company', 'corporate'],
      'health': ['health', 'medical', 'medicine', 'doctor', 'patient', 'treatment'],
      'science': ['science', 'research', 'study', 'experiment', 'discovery'],
      'politics': ['politics', 'government', 'election', 'policy', 'political'],
      'sports': ['sport', 'game', 'team', 'player', 'match', 'tournament'],
      'education': ['education', 'school', 'university', 'student', 'learning']
    };

    const tags = [];

    Object.entries(topicKeywords).forEach(([category, keywords]) => {
      const hasKeyword = keywords.some(keyword => text.includes(keyword));
      if (hasKeyword) {
        tags.push(category);
      }
    });

    return tags;
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format article for API request
   * @param {Object} articleData - Raw article data
   * @returns {Object} Formatted article data
   */
  formatForAPI(articleData) {
    const validation = this.validateArticle(articleData);
    
    if (!validation.isValid) {
      throw new Error(`Article validation failed: ${validation.errors.join(', ')}`);
    }

    const keyInfo = this.extractKeyInfo(articleData);
    const sanitizedContent = this.sanitizeContent(articleData.plainText);
    const truncatedContent = this.truncateContent(sanitizedContent, 3000);

    return {
      title: keyInfo.title,
      content: truncatedContent,
      url: keyInfo.url,
      domain: keyInfo.domain,
      author: keyInfo.author,
      wordCount: keyInfo.wordCount,
      language: keyInfo.language,
      contentType: keyInfo.contentType,
      tags: keyInfo.tags,
      extractedAt: articleData.extractedAt || new Date().toISOString(),
      metadata: {
        originalLength: articleData.plainText?.length || 0,
        truncated: truncatedContent.length < sanitizedContent.length,
        readingTime: keyInfo.readingTime,
        publishedDate: keyInfo.publishedDate,
        validationWarnings: validation.warnings
      }
    };
  }

  /**
   * Generate content summary
   * @param {string} content - Content to summarize
   * @param {number} maxLength - Maximum summary length
   * @returns {string} Content summary
   */
  generateSummary(content, maxLength = 200) {
    if (!content) {
      return '';
    }

    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    let summary = '';

    for (const sentence of sentences) {
      if (summary.length + sentence.length <= maxLength) {
        summary += sentence;
      } else {
        break;
      }
    }

    return summary.trim() || content.substring(0, maxLength) + '...';
  }
}

// Export singleton instance
export const articleExtractor = new ArticleExtractor();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ArticleExtractor, articleExtractor };
}