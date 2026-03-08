"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings

app = FastAPI(
    title="QuietNight API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def startup():
    key_set = bool(getattr(settings, "openai_api_key", "") or "")
    print(f"[config] OPENAI_API_KEY loaded: {key_set}")


@app.get("/health")
def health():
    return {"status": "ok"}
