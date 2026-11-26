from database import initialize_database
import models
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.agent import router as agent_router
from routes.alerts import router as alerts_router
from routes.auth import router as auth_router
from routes.careplans import router as careplans_router
from routes.checkins import router as checkins_router
from routes.discharge import router as discharge_router
from routes.patients import router as patients_router

# Create FastAPI application
app = FastAPI(
    title="RE:CARE AI",
    description="Predictive Recovery Intelligence Backend",
    version="1.0.0"
)
# Create database tables and apply additive SQLite column migrations.
initialize_database()
# Connect patient API
app.include_router(patients_router)
app.include_router(auth_router)
app.include_router(agent_router)
app.include_router(discharge_router)
app.include_router(checkins_router)
app.include_router(alerts_router)
app.include_router(careplans_router)

# Allow communication with React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home route
@app.get("/")
def home():
    return {
        "message": "Welcome to RE:CARE AI",
        "project": "Predictive Recovery Intelligence"
    }


# Health check route
@app.get("/health")
def health_check():
    return {
        "status": "running",
        "backend": "FastAPI",
        "project": "RE:CARE AI"
    }
