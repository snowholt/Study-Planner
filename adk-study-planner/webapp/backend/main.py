"""ADK Study Planner - FastAPI Authentication Backend."""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import settings
from database import init_db
from routers import auth_router, user_router, chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description="Multi-user authentication wrapper for ADK Study Planner",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


# Include routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(user_router.router, prefix="/api")
app.include_router(chat_router.router, prefix="/api")

# Serve static frontend files
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA for all non-API routes."""
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
else:
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "app": settings.app_name,
            "version": "1.0.0",
            "status": "running"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
