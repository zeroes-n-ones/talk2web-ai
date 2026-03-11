"""
LLM Service for Talk2Web AI Backend
Handles communication with Groq LLM provider
"""

from groq import Groq
import os


class LLMService:
    """Minimal LLM service that uses Groq directly"""
    
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    async def generate_response(self, messages, max_tokens=500):
        """Generate response using Groq API"""
        completion = self.client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=max_tokens
        )
        
        return completion.choices[0].message.content