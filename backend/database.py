
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite database file
DATABASE_URL = "sqlite:///./recare.db"

# Create database engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

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
