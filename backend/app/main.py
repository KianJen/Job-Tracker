from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from . import storage
from .config import settings
from .database import Base, engine
from .routers import documents, jobs


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Create tables if they don't exist. For production, switch to Alembic migrations.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Make sure the object-storage bucket exists.
    await run_in_threadpool(storage.ensure_bucket)
    yield
    await engine.dispose()


app = FastAPI(title="Job Tracker API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(documents.router)


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}
