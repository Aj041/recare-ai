# Doctor authentication prototype

The doctor login and bearer-token checks are a hackathon prototype, not production-ready clinical authentication. There is no password reset, account recovery, refresh token, MFA, audit-grade identity proofing, or session revocation.

`backend/start_backend.ps1` loads configuration from the backend `.env`, generates and saves a random `JWT_SECRET_KEY` when none is configured, initializes the database, and prompts once to create a local doctor account if the `doctors` table is empty. The password prompt is hidden; only a salted PBKDF2 password hash is stored. Existing doctor accounts authenticate from their stored hash and do not require bootstrap credentials in `.env`. `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` controls token lifetime and defaults to 30 minutes.

Login is `POST /api/auth/doctor/login` with JSON `{ "email": "...", "password": "..." }`. Send the returned access token as `Authorization: Bearer <token>` to the doctor-only Recovery Companion endpoints.

Do not use real patient data or deploy this authentication setup for clinical use.
