from fastapi import FastAPI
from app.api import projects, media, search, chat, change, reports
from app.database import engine, Base, ensure_schema_updated

# Create the SQLite tables immediately
Base.metadata.create_all(bind=engine)
ensure_schema_updated()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MIRA — Multimodal Intelligent Retrieval & Analysis",
    description="AI-Powered Field Media Intelligence, Semantic Routing & Retrieval Platform Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(projects.router)
app.include_router(media.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(change.router)
app.include_router(reports.router)

@app.on_event("startup")
def on_startup():
    from app.database import SessionLocal
    from app.services.search_service import SearchService
    db = SessionLocal()
    try:
        search_service = SearchService.get_instance()
        search_service.sync_all_from_db(db)
    except Exception as e:
        print(f"[STARTUP] Notice: Qdrant sync deferred: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Impact & Sustainability Media Platform API"}

