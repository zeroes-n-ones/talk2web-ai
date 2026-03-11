"""
Query Router for Talk2Web AI Backend
Handles article summarization and question answering requests
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import time
from datetime import datetime

from app.services.llm_service import LLMService

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize services
llm_service = LLMService()


# Request/Response Models
class QueryRequest(BaseModel):
    """Request model for query endpoint"""
    article_text: str = Field(..., description="Extracted article text", min_length=50, max_length=10000)
    query: str = Field(..., description="User query or request", min_length=1, max_length=500)
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Conversation history with role and content")
    language: Optional[str] = Field("auto", description="Language code (en, hi, or auto)")
    context: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Previous conversation context (deprecated, use history)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "article_text": "This is a sample article about artificial intelligence...",
                "query": "Summarize this article",
                "history": [
                    {"role": "user", "content": "What is this article about?"},
                    {"role": "assistant", "content": "This article discusses AI developments..."}
                ],
                "language": "en",
                "context": [],
                "metadata": {
                    "url": "https://example.com/article",
                    "title": "AI Article"
                }
            }
        }


class QueryResponse(BaseModel):
    """Response model for query endpoint"""
    success: bool = Field(..., description="Whether the request was successful")
    response_text: str = Field(..., description="AI-generated response")
    query_type: str = Field(..., description="Type of query processed")
    language: str = Field(..., description="Detected/used language")
    processing_time: float = Field(..., description="Time taken to process request (seconds)")
    timestamp: str = Field(..., description="Response timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional response metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "response_text": "This article discusses the latest developments in AI...",
                "query_type": "summarization",
                "language": "en",
                "processing_time": 2.5,
                "timestamp": "2024-03-10T15:30:00Z",
                "metadata": {
                    "word_count": 150,
                    "model_used": "gpt-3.5-turbo"
                }
            }
        }


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = Field(False, description="Always false for errors")
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error")
    timestamp: str = Field(..., description="Error timestamp")


@router.post("/query", response_model=QueryResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def process_query(request: QueryRequest, background_tasks: BackgroundTasks):
    """
    Process user query against article content
    
    This endpoint handles both article summarization and question answering.
    It automatically detects the query type and routes to the appropriate tool.
    """
    start_time = time.time()
    
    try:
        # Print incoming payload for debugging
        logger.info(f"=== INCOMING REQUEST DEBUG ===")
        logger.info(f"Article text length: {len(request.article_text)} chars")
        logger.info(f"Article text preview: {request.article_text[:200]}...")
        logger.info(f"Query: {request.query}")
        logger.info(f"Language: {request.language}")
        logger.info(f"History: {request.history}")
        logger.info(f"=== END REQUEST DEBUG ===")
        
        # Validate request
        if not request.article_text.strip():
            raise HTTPException(status_code=400, detail="Article text cannot be empty")
        
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Detect query type
        query_type = detect_query_type(request.query)
        logger.info(f"Processing {query_type} query: {request.query[:100]}...")
        
        # Detect language if auto
        language = request.language
        if language == "auto":
            language = detect_language(request.query, request.article_text)
        
        # Process query based on type
        if query_type == "summarization":
            response_text = await process_summarization(request, language)
        elif query_type == "question_answering":
            response_text = await process_question_answering(request, language)
        else:
            # Default to general processing
            response_text = await process_general_query(request, language)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Create response
        response = QueryResponse(
            success=True,
            response_text=response_text,
            query_type=query_type,
            language=language,
            processing_time=processing_time,
            timestamp=datetime.utcnow().isoformat() + "Z",
            metadata={
                "word_count": len(request.article_text.split()),
                "query_length": len(request.query),
                "has_context": len(request.context) > 0 if request.context else False
            }
        )
        
        # Log successful processing
        logger.info(
            f"Successfully processed {query_type} query in {processing_time:.2f}s "
            f"(Language: {language}, Words: {len(request.article_text.split())})"
        )
        
        # Add background task for logging/analytics if needed
        background_tasks.add_task(log_query_analytics, request, response)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing query: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/query/types", tags=["query"])
async def get_query_types():
    """Get available query types and examples"""
    return {
        "query_types": {
            "summarization": {
                "description": "Generate a concise summary of the article",
                "examples": [
                    "Summarize this article",
                    "Give me the main points",
                    "What is this about?",
                    "Brief summary"
                ]
            },
            "question_answering": {
                "description": "Answer specific questions about the article content",
                "examples": [
                    "Who is the author?",
                    "What are the key findings?",
                    "When was this published?",
                    "Explain the main concept"
                ]
            },
            "general": {
                "description": "General interaction with the article content",
                "examples": [
                    "Tell me more about this topic",
                    "What do you think about this?",
                    "Analyze this article"
                ]
            }
        },
        "supported_languages": ["en", "hi", "auto"],
        "max_article_length": 10000,
        "max_query_length": 500
    }


def detect_query_type(query: str) -> str:
    """Detect the type of query based on keywords and patterns"""
    query_lower = query.lower().strip()
    
    # Summarization keywords
    summarize_keywords = [
        "summarize", "summary", "summarization", "brief", "main points",
        "overview", "gist", "recap", "what is this about", "tell me about",
        "explain briefly", "short version"
    ]
    
    # Question answering patterns (questions)
    question_patterns = [
        "who", "what", "when", "where", "why", "how", "which", "whose",
        "can you", "could you", "would you", "is there", "are there",
        "does", "do", "did", "will", "shall", "should", "may", "might"
    ]
    
    # Check for summarization
    if any(keyword in query_lower for keyword in summarize_keywords):
        return "summarization"
    
    # Check for questions
    if any(query_lower.startswith(pattern) or f" {pattern} " in query_lower for pattern in question_patterns):
        return "question_answering"
    
    # Check for question mark
    if query_lower.endswith('?'):
        return "question_answering"
    
    # Default to general
    return "general"


def detect_language(query: str, article_text: str) -> str:
    """Detect language from query and article text"""
    # Simple language detection based on character patterns
    hindi_pattern = r'[\u0900-\u097F]'
    
    # Check query first
    import re
    if re.search(hindi_pattern, query):
        return "hi"
    
    # Check article text
    if re.search(hindi_pattern, article_text):
        return "hi"
    
    # Default to English
    return "en"


async def process_summarization(request: QueryRequest, language: str) -> str:
    """Process summarization request"""
    try:
        # Truncate article text to prevent token overflow
        article_text = request.article_text[:8000]
        
        # Build prompt for summarization with article context and history
        prompt = f"""Please provide a concise summary of the following article. Focus on the main points and key information.

ARTICLE CONTENT:
{article_text}

CONVERSATION HISTORY:
{format_history(request.history or [])}

Please provide a concise summary focusing on the main points and key information:"""
        
        logger.info(f"=== LLM CALL DEBUG ===")
        logger.info(f"Provider: Groq")
        logger.info(f"Model: llama-3.1-8b-instant")
        logger.info(f"Language: {language}")
        logger.info(f"Max tokens: 300")
        logger.info(f"=== END LLM DEBUG ===")
        
        # Generate summary using LLM service
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant that provides accurate and concise responses."},
            {"role": "user", "content": prompt}
        ]
        summary = await llm_service.generate_response(
            messages=messages,
            max_tokens=300
        )
        
        logger.info(f"LLM response received: {summary[:100]}...")
        return summary
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "response_text": str(e)
        }


async def process_question_answering(request: QueryRequest, language: str) -> str:
    """Process question answering request"""
    try:
        # Truncate article text to prevent token overflow
        article_text = request.article_text[:8000]
        
        # Build prompt for Q&A with article context and history
        prompt = f"""Please answer the following question based only on the provided article content. If the answer is not found in the article, say so clearly.

ARTICLE CONTENT:
{article_text}

CONVERSATION HISTORY:
{format_history(request.history or [])}

QUESTION:
{request.query}

Based only on the article content above, answer the question:"""
        
        logger.info(f"=== LLM CALL DEBUG ===")
        logger.info(f"Provider: Groq")
        logger.info(f"Model: llama-3.1-8b-instant")
        logger.info(f"Language: {language}")
        logger.info(f"Max tokens: 400")
        logger.info(f"=== END LLM DEBUG ===")
        
        # Generate answer using LLM service
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant that provides accurate and concise responses."},
            {"role": "user", "content": prompt}
        ]
        answer = await llm_service.generate_response(
            messages=messages,
            max_tokens=400
        )
        
        logger.info(f"LLM response received: {answer[:100]}...")
        return answer
        
    except Exception as e:
        logger.error(f"Question answering failed: {str(e)}", exc_info=True)
        # Return a fallback response instead of raising HTTP exception
        return "I apologize, but I encountered an error while trying to answer your question. Please try again or rephrase your question."


async def process_general_query(request: QueryRequest, language: str) -> str:
    """Process general query request"""
    try:
        # Truncate article text to prevent token overflow
        article_text = request.article_text[:8000]
        
        # Build general prompt with article context and history
        prompt = f"""Please provide a helpful response to the user's query based on the article content.

ARTICLE CONTENT:
{article_text}

CONVERSATION HISTORY:
{format_history(request.history or [])}

USER QUERY:
{request.query}

Provide a helpful response based on the article content:"""
        
        logger.info(f"=== LLM CALL DEBUG ===")
        logger.info(f"Provider: Groq")
        logger.info(f"Model: llama-3.1-8b-instant")
        logger.info(f"Language: {language}")
        logger.info(f"Max tokens: 500")
        logger.info(f"=== END LLM DEBUG ===")
        
        # Generate response using LLM service
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant that provides accurate and concise responses."},
            {"role": "user", "content": prompt}
        ]
        response = await llm_service.generate_response(
            messages=messages,
            max_tokens=500
        )
        
        logger.info(f"LLM response received: {response[:100]}...")
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "response_text": str(e)
        }


def format_history(history: List[Dict[str, str]]) -> str:
    """Format conversation history for prompt"""
    if not history:
        return "No previous conversation history."
    
    # Trim to last 10 messages (5 turns)
    recent_history = history[-10:]
    
    formatted_lines = []
    for i, item in enumerate(recent_history, 1):
        role = item.get('role', '')
        content = item.get('content', '')
        
        if role and content:
            if role == 'user':
                formatted_lines.append(f"{i}. User: {content}")
            elif role == 'assistant':
                formatted_lines.append(f"   Assistant: {content}")
    
    return "\n".join(formatted_lines) if formatted_lines else "No previous conversation history."


async def log_query_analytics(request: QueryRequest, response: QueryResponse):
    try:
        analytics_data = {
            "query_type": detect_query_type(request.query),
            "language": detect_language(request.query, request.article_text),
            "has_context": len(request.context) > 0 if request.context else False,
            "success": response.success
        }
        
        # Log analytics (in production, this would go to a database or analytics service)
        logger.info(f"Query analytics: {analytics_data}")
        
    except Exception as e:
        # Don't fail the main request if analytics logging fails
        logger.warning(f"Failed to log analytics: {str(e)}")