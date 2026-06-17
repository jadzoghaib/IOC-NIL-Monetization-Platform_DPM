"""
My Match Olympics — FastAPI backend
Run: uvicorn main:app --reload --port 8000
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure backend/ is on sys.path so `from data.xxx import ...` works
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()  # reads backend/.env if present

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.athletes import router as athletes_router
from routes.news import router as news_router
from routes.offerings import router as offerings_router
from routes.matching import router as matching_router
from services.news_scheduler import start_scheduler
from data.athletes_data import get_all_athletes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting My Match Olympics API …")
    start_scheduler(get_all_athletes())
    yield
    logger.info("Shutting down.")


app = FastAPI(title="My Match Olympics API", version="1.0.0", lifespan=lifespan)

# CORS — local Vite dev server by default, plus any origins from the
# ALLOWED_ORIGINS env var (comma-separated) for production, e.g. your Vercel URL:
#   ALLOWED_ORIGINS=https://my-match-olympics.vercel.app
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(athletes_router)
app.include_router(news_router)
app.include_router(offerings_router)
app.include_router(matching_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "My Match Olympics API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
