from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Using SQLite for speed/portability during the hackathon. 
# The ORM allows swapping to PostgreSQL simply by changing this URL later.
SQLALCHEMY_DATABASE_URL = "sqlite:///./cc_hack.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_updated():
    """Ensure newly added columns exist in existing SQLite tables."""
    migrations = [
        ("projects", "latitude", "REAL"),
        ("projects", "longitude", "REAL"),
        ("projects", "location_name", "TEXT"),
        ("media_assets", "image_latitude", "REAL"),
        ("media_assets", "image_longitude", "REAL"),
        ("media_assets", "location_source", "TEXT DEFAULT 'NONE'"),
        ("media_assets", "location_match_distance", "REAL"),
        ("visual_evidence", "latitude", "REAL"),
        ("visual_evidence", "longitude", "REAL"),
        ("visual_evidence", "location_source", "TEXT DEFAULT 'NONE'"),
        ("visual_evidence", "location_match_distance", "REAL"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

