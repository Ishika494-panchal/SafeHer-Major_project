from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import sos, contacts, auth as auth_router
import logging

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# Initialize database tables on app startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SafeHer Core API Engine",
    description="AI-powered women's safety platform backend API - SOS Distress, Live Geolocation, Emergency Contacts & Firebase Auth",
    version="1.0.0"
)

# Configure CORS for local development & Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local dev requests from Vite http://localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(sos.router)
app.include_router(contacts.router)

@app.get("/")
def health_check():
    return {
        "app": "SafeHer Core Backend",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
