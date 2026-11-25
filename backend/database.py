
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

# Keep the existing backend/recare.db file as the default regardless of the
# shell's current directory. An explicit DATABASE_URL in .env still wins.
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{(BACKEND_DIR / 'recare.db').as_posix()}"
if DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    configured_path = Path(DATABASE_URL.removeprefix("sqlite:///"))
    if not configured_path.is_absolute():
        configured_path = BACKEND_DIR / configured_path
    DATABASE_URL = f"sqlite:///{configured_path.resolve().as_posix()}"

# Create database engine
engine_options = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite:") else {}
engine = create_engine(DATABASE_URL, **engine_options)

# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for database models
Base = declarative_base()


# Database connection for API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        migrations = {
            "checkins": {
                "temperature_c": "FLOAT",
                "medication_taken": "BOOLEAN",
                "reported_symptoms": "TEXT",
            },
            "alerts": {
                "rule_triggered": "VARCHAR(100)",
                "supporting_check_ins": "TEXT",
            },
        }

        for table_name, additions in migrations.items():
            columns = {
                column["name"]
                for column in inspect(connection).get_columns(table_name)
            }
            for column_name, column_type in additions.items():
                if column_name not in columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table_name} ADD COLUMN "
                            f"{column_name} {column_type}"
                        )
                    )
