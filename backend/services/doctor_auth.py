"""Minimal hackathon JWT authentication for doctor-only endpoints.

This is a prototype identity boundary, not production clinical authentication.
Provision a synthetic demo account with DEMO_DOCTOR_EMAIL and
DEMO_DOCTOR_PASSWORD; only its salted password hash is stored in SQLite.
"""

import base64
import argparse
import hashlib
import hmac
import json
import os
import secrets
import getpass
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import SessionLocal, get_db, initialize_database
from models import Doctor

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

_TOKEN_ISSUER = "recare-ai-hackathon"
_PASSWORD_ITERATIONS = 310_000
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/doctor/login",
    auto_error=False,
)


def _jwt_secret() -> bytes:
    value = os.getenv("JWT_SECRET_KEY")
    if not value or len(value.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET_KEY must be configured with at least 32 bytes.")
    return value.encode("utf-8")


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PASSWORD_ITERATIONS
    )
    return f"pbkdf2_sha256${_PASSWORD_ITERATIONS}${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, rounds, salt, expected = encoded_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), _b64decode(salt), int(rounds)
        )
        return hmac.compare_digest(actual, _b64decode(expected))
    except (ValueError, TypeError, UnicodeError):
        return False


def ensure_demo_doctor(db: Session) -> Doctor | None:
    """Create one configured synthetic account, storing only its password hash."""
    email = os.getenv("DEMO_DOCTOR_EMAIL", "").strip().casefold()
    password = os.getenv("DEMO_DOCTOR_PASSWORD", "")
    if not email or not password:
        return None
    doctor = db.query(Doctor).filter(Doctor.email == email).first()
    if doctor is None:
        doctor = Doctor(
            email=email,
            password_hash=hash_password(password),
            role="doctor",
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)
    return doctor


def create_access_token(email: str, role: str, expires_in: int | None = None) -> tuple[str, int]:
    secret = _jwt_secret()
    if expires_in is None:
        try:
            expires_in = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")) * 60
        except ValueError as exc:
            raise RuntimeError("JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be an integer.") from exc
    if expires_in < 60:
        raise RuntimeError("JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be at least 1.")
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": email,
        "role": role,
        "iss": _TOKEN_ISSUER,
        "iat": now,
        "exp": now + expires_in,
    }
    signing_input = f"{_b64encode(json.dumps(header, separators=(',', ':')).encode())}.{_b64encode(json.dumps(payload, separators=(',', ':')).encode())}"
    signature = hmac.new(secret, signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64encode(signature)}", expires_in


def decode_access_token(token: str) -> dict:
    secret = _jwt_secret()
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected = hmac.new(secret, signing_input.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64decode(encoded_signature)):
            raise ValueError("signature")
        header = json.loads(_b64decode(encoded_header))
        payload = json.loads(_b64decode(encoded_payload))
        if header != {"alg": "HS256", "typ": "JWT"}:
            raise ValueError("algorithm")
        if payload.get("iss") != _TOKEN_ISSUER:
            raise ValueError("issuer")
        if not isinstance(payload.get("exp"), int) or payload["exp"] <= int(time.time()):
            raise ValueError("expiration")
        if not isinstance(payload.get("sub"), str) or not payload["sub"]:
            raise ValueError("subject")
        return payload
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError, KeyError) as exc:
        raise ValueError("Invalid or expired access token.") from exc


def _auth_error(status_code: int, detail: str):
    return HTTPException(
        status_code=status_code,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"} if status_code == 401 else None,
    )


def get_current_doctor(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Doctor:
    if not token:
        raise _auth_error(401, "Bearer access token required")
    try:
        claims = decode_access_token(token)
    except RuntimeError as exc:
        raise _auth_error(503, str(exc)) from exc
    except ValueError as exc:
        raise _auth_error(401, "Invalid or expired access token") from exc
    if claims.get("role") != "doctor":
        raise _auth_error(403, "Doctor role required")
    doctor = db.query(Doctor).filter(Doctor.email == claims["sub"].casefold()).first()
    if doctor is None or doctor.role != "doctor":
        raise _auth_error(403, "Doctor role required")
    return doctor


def provision_local_doctor_if_needed() -> None:
    """Interactively create the first local doctor account, storing only a hash."""
    initialize_database()
    with SessionLocal() as db:
        if db.query(Doctor.id).first() is not None:
            print("A doctor account is already provisioned.")
            return
        _create_or_reset_doctor(db, allow_reset=False)


def _read_credentials() -> tuple[str, str]:
    print("Password input is hidden and is never printed or stored as plaintext.")
    email = input("Doctor email: ").strip().casefold()
    password = getpass.getpass("Doctor password (12+ characters): ")
    confirmation = getpass.getpass("Confirm doctor password: ")
    if "@" not in email or len(email) > 254:
        raise SystemExit("Enter a valid email address.")
    if len(password) < 12:
        raise SystemExit("Use a password with at least 12 characters.")
    if not hmac.compare_digest(password, confirmation):
        raise SystemExit("Passwords did not match; no account was changed.")
    return email, password


def _create_or_reset_doctor(db: Session, allow_reset: bool) -> tuple[str, str]:
    email, password = _read_credentials()
    doctor = db.query(Doctor).filter(Doctor.email == email).first()
    if doctor is not None:
        if not allow_reset:
            raise SystemExit("That doctor account exists. Re-run with --reset to change its password.")
        doctor.password_hash = hash_password(password)
        doctor.role = "doctor"
        db.add(doctor)
        message = "Doctor password reset."
    else:
        db.add(Doctor(email=email, password_hash=hash_password(password), role="doctor"))
        message = "Doctor account created."
    db.commit()
    print(message + " Only a salted password hash was stored.")
    return email, password


def verify_live_login(email: str, password: str, base_url: str) -> None:
    """Verify a provisioned account over HTTP without writing its token to output."""
    request = Request(
        f"{base_url.rstrip('/')}/api/auth/doctor/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise SystemExit(f"Live login failed with HTTP {exc.code}.") from exc
    except (URLError, ValueError) as exc:
        raise SystemExit("Live login could not be verified.") from exc
    if response.status != 200 or not isinstance(payload.get("access_token"), str):
        raise SystemExit("Live login response did not include a bearer token.")
    print("Live login verified successfully; the bearer token was not displayed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision or reset a local doctor account.")
    parser.add_argument("--reset", action="store_true", help="Reset one doctor account selected by email.")
    parser.add_argument(
        "--verify-live",
        metavar="BASE_URL",
        help="Verify the entered credentials against a running backend, for example http://127.0.0.1:8002.",
    )
    args = parser.parse_args()
    initialize_database()
    with SessionLocal() as db:
        email, password = _create_or_reset_doctor(db, allow_reset=args.reset)
    if args.verify_live:
        verify_live_login(email, password, args.verify_live)
