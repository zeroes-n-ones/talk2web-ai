"""
Question Answering Tool for Talk2Web AI Backend
Handles question answering functionality
"""

import logging
from typing import List, Dict, Any, Optional
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class QATool:
    """Tool for answering questions about article content"""
    
    def __init__(self):
        self.llm_service = LLMService()
    
    async def answer_question(self, article_text: str, question: str, language: str = "en", history: Optional[List[Dict[str, str]]] = None, context: Optional[List[Dict[str, Any]]] = None) -> str:
        """Answer question based on article content"""
        try:
            # Build Q&A prompt
            prompt = self._build_qa_prompt(article_text, question, language, history or [], context or [])
            
            # Generate answer
            answer = await self.llm_service.generate_response(
                prompt=prompt,
                language=language,
                max_tokens=400,
                temperature=0.3
            )
            
            logger.info(f"Generated answer in {language}")
            return answer
            
        except Exception as e:
            logger.error(f"Question answering failed: {str(e)}")
            raise
    
    def _build_qa_prompt(self, article_text: str, question: str, language: str, history: List[Dict[str, str]], context: List[Dict[str, Any]]) -> str:
        """Build prompt for question answering"""
        # Truncate article if too long
        max_text_length = 2500
        if len(article_text) > max_text_length:
            article_text = article_text[:max_text_length] + "..."
        
        # Language-specific instructions
        lang_instructions = {
            "en": "Answer the following question based only on the provided article content",
            "hi": "केवल दिए गए लेख सामग्री के आधार पर निम्नलिखित प्रश्न का उत्तर दें"
        }
        
        instruction = lang_instructions.get(language, "Answer the question based on the provided article content")
        
        prompt = f"""{instruction}. If the answer is not found in the article, say so clearly.

ARTICLE:
{article_text}

HISTORY:
{self._format_history(history)}

CONTEXT:
{self._format_context(context)}

QUESTION:
{question}

ANSWER:"""
        
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