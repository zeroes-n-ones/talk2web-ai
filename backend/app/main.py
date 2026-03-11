"""
Talk2Web AI Backend Application
FastAPI application for handling AI-powered web content interaction
"""

from dotenv import load_dotenv
import os

# Load environment variables from .env file
backend_dir = os.path.dirname(os.path.dirname(__file__))
dotenv_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path)

# Debug logging after loading env variables
print("GROQ_API_KEY found:", "Yes" if os.getenv("GROQ_API_KEY") else "No")
print("GROQ_MODEL:", os.getenv("GROQ_MODEL"))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from contextlib import asynccontextmanager

from app.routers.query_router import router as query_router
from app.utils.prompt_builder import PromptBuilder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Application state
app_state = {
    "prompt_builder": None,
    "start_time": None,
    "request_count": 0
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Talk2Web AI Backend...")
    app_state["start_time"] = time.time()
    app_state["prompt_builder"] = PromptBuilder()
    
    logger.info("Backend application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Talk2Web AI Backend...")


# Create FastAPI application
app = FastAPI(
    title="Talk2Web AI Backend",
    description="AI-powered voice assistant for web content interaction",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time header to responses"""
    start_time = time.time()
    app_state["request_count"] += 1
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-Count"] = str(app_state["request_count"])
    
    # Log request details
    logger.info(
        f"Request: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.4f}s"
    )
    
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "error_type": "http_exception",
            "timestamp": time.time()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "error_type": "internal_error",
            "timestamp": time.time()
        }
    )


# Include routers
app.include_router(query_router, prefix="/api/v1", tags=["query"])


@app.get("/", tags=["health"])
async def root():
    """Root endpoint - basic health check"""
    uptime = time.time() - app_state["start_time"] if app_state["start_time"] else 0
    
    return {
        "message": "Talk2Web AI Backend is running",
        "version": "1.0.0",
        "status": "healthy",
        "uptime_seconds": round(uptime, 2),
        "request_count": app_state["request_count"]
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Detailed health check endpoint"""
    uptime = time.time() - app_state["start_time"] if app_state["start_time"] else 0
    
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "uptime_seconds": round(uptime, 2),
        "request_count": app_state["request_count"],
        "components": {
            "prompt_builder": app_state["prompt_builder"] is not None,
            "environment": check_environment()
        }
    }
    
    # Determine overall health
    all_healthy = all(health_status["components"].values())
    health_status["status"] = "healthy" if all_healthy else "degraded"
    
    return health_status


def check_environment():
    """Check if required environment variables are set"""
    required_vars = ["GROQ_API_KEY"]
    optional_vars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
    
    # Check for required Groq key
    groq_key = os.getenv("GROQ_API_KEY")
    
    # Check for at least one AI provider key
    has_ai_key = groq_key is not None or any(os.getenv(var) for var in optional_vars)
    
    return {
        "groq_configured": groq_key is not None,
        "ai_provider_configured": has_ai_key,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/info", tags=["info"])
async def app_info():
    """Application information endpoint"""
    return {
        "name": "Talk2Web AI Backend",
        "version": "1.0.0",
        "description": "AI-powered voice assistant for web content interaction",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "endpoints": {
            "health": "/health",
            "query": "/api/v1/query",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "features": {
            "article_summarization": True,
            "question_answering": True,
            "multilingual_support": True,
            "context_retention": True
        }
    }


# Development-only endpoints
if os.getenv("ENVIRONMENT") == "development":
    
    @app.get("/debug/state", tags=["debug"])
    async def debug_state():
        """Debug endpoint to view application state"""
        return {
            "app_state": {
                "start_time": app_state["start_time"],
                "request_count": app_state["request_count"],
                "prompt_builder_initialized": app_state["prompt_builder"] is not None
            },
            "environment": dict(os.environ)
        }
    
    @app.post("/debug/reset", tags=["debug"])
    async def debug_reset():
        """Debug endpoint to reset application state"""
        app_state["request_count"] = 0
        app_state["start_time"] = time.time()
        return {"message": "Application state reset"}


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False,
        log_level="info"
    )