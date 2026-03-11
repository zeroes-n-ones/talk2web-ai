"""
Summarization Tool for Talk2Web AI Backend
Handles article summarization functionality
"""

import logging
from typing import List, Dict, Any, Optional
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class SummarizeTool:
    """Tool for generating article summaries"""
    
    def __init__(self):
        self.llm_service = LLMService()
    
    async def summarize(self, text: str, language: str = "en", history: Optional[List[Dict[str, str]]] = None, context: Optional[List[Dict[str, Any]]] = None) -> str:
        """Generate summary of the given text"""
        try:
            # Build summarization prompt
            prompt = self._build_summarization_prompt(text, language, history or [], context or [])
            
            # Generate summary
            summary = await self.llm_service.generate_response(
                prompt=prompt,
                language=language,
                max_tokens=300,
                temperature=0.5
            )
            
            logger.info(f"Generated summary in {language}")
            return summary
            
        except Exception as e:
            logger.error(f"Summarization failed: {str(e)}")
            raise
    
    def _build_summarization_prompt(self, text: str, language: str, history: List[Dict[str, str]], context: List[Dict[str, Any]]) -> str:
        """Build prompt for summarization"""
        # Truncate text if too long
        max_text_length = 3000
        if len(text) > max_text_length:
            text = text[:max_text_length] + "..."
        
        # Language-specific instructions
        lang_instructions = {
            "en": "Provide a concise summary in English",
            "hi": "देवनागरी में एक संक्षिप्त सारांश प्रदान करें"
        }
        
        instruction = lang_instructions.get(language, "Provide a concise summary")
        
        prompt = f"""{instruction} of the following article. Focus on the main points and key information.

ARTICLE:
{text}

HISTORY:
{self._format_history(history)}

CONTEXT:
{self._format_context(context)}

SUMMARY:"""
        
        return prompt
    
    def _format_history(self, history: List[Dict[str, str]]) -> str:
        """Format conversation history"""
        if not history:
            return "No previous conversation history."
        
        # Trim to last 10 messages (5 turns)
        recent_history = history[-10:]
        
        formatted = []
        for item in recent_history:
            role = item.get('role', '')
            content = item.get('content', '')
            if role == 'user':
                formatted.append(f"User: {content}")
            elif role == 'assistant':
                formatted.append(f"Assistant: {content}")
        
        return "\n".join(formatted)
    
    def _format_context(self, context: List[Dict[str, Any]]) -> str:
        """Format conversation context"""
        if not context:
            return "No previous context."
        
        formatted = []
        for i, item in enumerate(context[-3:], 1):  # Last 3 items
            formatted.append(f"{i}. Q: {item.get('query', '')}")
            formatted.append(f"   A: {item.get('response', '')}")
        
        return "\n".join(formatted)