"""Prepare local development auth and database without printing secrets."""

import os
import secrets
import sys
from pathlib import Path

from dotenv import load_dotenv, set_key

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(ENV_FILE)


def prepare_local_environment(provision_doctor: bool = True) -> None:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret.encode("utf-8")) < 32 or any(
        marker in secret.casefold() for marker in ("replace_with", "placeholder", "your_")
    ):
        secret = secrets.token_urlsafe(48)
        ENV_FILE.touch(exist_ok=True)
        set_key(str(ENV_FILE), "JWT_SECRET_KEY", secret)
        os.environ["JWT_SECRET_KEY"] = secret
        print("Generated and saved a local JWT signing secret; its value is hidden.")
    else:
        print("JWT signing secret is configured; its value is hidden.")

    # Import models before create_all so new and legacy tables are registered.
    import models  # noqa: F401
    from database import SessionLocal, initialize_database
    from models import Doctor

    initialize_database()
    with SessionLocal() as db:
        has_doctor = db.query(Doctor.id).first() is not None
    if has_doctor:
        print("Database initialized; a doctor account is already provisioned.")
        return

    if not provision_doctor:
        print("Database initialized; no doctor account was created.")
        return

    from services.doctor_auth import provision_local_doctor_if_needed

    provision_local_doctor_if_needed()


if __name__ == "__main__":
    prepare_local_environment(provision_doctor="--prepare-only" not in sys.argv)
