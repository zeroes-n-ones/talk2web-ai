"""
Prompt Builder for Talk2Web AI Backend
Builds structured prompts for different query types
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class PromptBuilder:
    """Builds structured prompts for LLM interactions"""
    
    def __init__(self):
        self.max_context_items = 5  # 5 conversation turns (10 messages: 5 user + 5 assistant)
        self.max_article_length = 3000
    
    def build_summarization_prompt(self, article_text: str, language: str = "en", history: Optional[List[Dict[str, str]]] = None, context: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build prompt for article summarization"""
        # Truncate article if needed
        article_text = self._truncate_text(article_text, self.max_article_length)
        
        # Get language-specific instructions
        instructions = self._get_language_instructions("summarization", language)
        
        prompt = f"""{instructions}

ARTICLE CONTENT:
{article_text}

{self._format_history(history or [])}

Provide a concise summary focusing on the main points and key information:"""
        
        return prompt
    
    def build_qa_prompt(self, article_text: str, question: str, language: str = "en", history: Optional[List[Dict[str, str]]] = None, context: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build prompt for question answering"""
        # Truncate article if needed (shorter for Q&A)
        article_text = self._truncate_text(article_text, 2500)
        
        # Get language-specific instructions
        instructions = self._get_language_instructions("qa", language)
        
        prompt = f"""{instructions}

ARTICLE CONTENT:
{article_text}

{self._format_history(history or [])}

QUESTION: {question}

Based only on the article content above, answer the question:"""
        
        return prompt
    
    def build_general_prompt(self, article_text: str, query: str, language: str = "en", history: Optional[List[Dict[str, str]]] = None, context: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build prompt for general queries"""
        # Truncate article if needed
        article_text = self._truncate_text(article_text, self.max_article_length)
        
        # Get language-specific instructions
        instructions = self._get_language_instructions("general", language)
        
        prompt = f"""{instructions}

ARTICLE CONTENT:
{article_text}

{self._format_history(history or [])}

USER QUERY: {query}

Provide a helpful response based on the article content:"""
        
        return prompt
    
    def _get_language_instructions(self, query_type: str, language: str) -> str:
        """Get language-specific instructions"""
        instructions = {
            "en": {
                "summarization": "You are a helpful AI assistant. Provide a concise summary of the following article in English.",
                "qa": "You are a helpful AI assistant. Answer the following question based only on the provided article content in English.",
                "general": "You are a helpful AI assistant. Respond to the user's query based on the article content in English."
            },
            "hi": {
                "summarization": "आप एक सहायक AI सहायक हैं। निम्नलिखित लेख का देवनागरी में एक संक्षिप्त सारांश प्रदान करें।",
                "qa": "आप एक सहायक AI सहायक हैं। केवल दिए गए लेख सामग्री के आधार पर देवनागरी में निम्नलिखित प्रश्न का उत्तर दें।",
                "general": "आप एक सहायक AI सहायक हैं। लेख सामग्री के आधार पर देवनागरी में उपयोगकर्ता की क्वेरी का उत्तर दें।"
            }
        }
        
        return instructions.get(language, instructions["en"]).get(query_type, instructions["en"]["general"])
    
    def _format_history(self, history: List[Dict[str, str]]) -> str:
        """Format conversation history with role-based structure"""
        if not history:
            return "No previous conversation context."
        
        # Trim to last 10 messages (5 turns: 5 user + 5 assistant)
        recent_history = history[-10:]
        
        if len(recent_history) == 0:
            return "No previous conversation context."
        
        formatted_lines = ["PREVIOUS CONVERSATION:"]
        for i, item in enumerate(recent_history, 1):
            role = item.get('role', '').strip()
            content = item.get('content', '').strip()
            
            if role and content:
                if role == 'user':
                    formatted_lines.append(f"{i}. User: {content}")
                elif role == 'assistant':
                    formatted_lines.append(f"   Assistant: {content}")
        
        return "\n".join(formatted_lines)
    
    def _format_context(self, context: List[Dict[str, Any]]) -> str:
        """Format conversation context"""
        if not context:
            return "No previous conversation context."
        
        # Take only last few items
        recent_context = context[-self.max_context_items:]
        
        if len(recent_context) == 0:
            return "No previous conversation context."
        
        formatted_lines = ["PREVIOUS CONVERSATION:"]
        for i, item in enumerate(recent_context, 1):
            query = item.get('query', '').strip()
            response = item.get('response', '').strip()
            
            if query and response:
                formatted_lines.append(f"{i}. User: {query}")
                formatted_lines.append(f"   Assistant: {response}")
        
        return "\n".join(formatted_lines)
    
    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to maximum length"""
        if len(text) <= max_length:
            return text
        
        # Try to truncate at sentence boundary
        truncated = text[:max_length]
        
        # Look for sentence endings
        sentence_endings = ['.', '!', '?', '\n']
        for i in range(len(truncated) - 1, max(0, len(truncated) - 200), -1):
            if truncated[i] in sentence_endings:
                return truncated[:i + 1]
        
        # If no good sentence boundary, add ellipsis
        return truncated + "..."
    
    def get_prompt_stats(self, prompt: str) -> Dict[str, Any]:
        """Get statistics about a prompt"""
        return {
            "character_count": len(prompt),
            "word_count": len(prompt.split()),
            "estimated_tokens": len(prompt.split()) * 1.3,  # Rough estimate
            "line_count": len(prompt.split('\n'))
        }