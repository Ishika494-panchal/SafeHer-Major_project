from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db
from models import User
import os
import logging

logger = logging.getLogger("safeher.auth")

# Firebase Admin SDK optional initialization
FIREBASE_INITIALIZED = False

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        FIREBASE_INITIALIZED = True
        logger.info("Firebase Admin initialized with service account certificate.")
    else:
        # Try initializing with default application credentials if available
        try:
            firebase_admin.initialize_app()
            FIREBASE_INITIALIZED = True
            logger.info("Firebase Admin initialized with default credentials.")
        except Exception:
            logger.warning("Firebase service account credentials not found. Running in Dev Auth mode.")
except Exception as e:
    logger.warning(f"Firebase Admin SDK not configured ({e}). Dev mode active.")


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to verify Firebase ID Token from Authorization header.
    In dev mode (or when bearer starts with 'dev-'), creates/returns a mock test user.
    """
    if not authorization:
        # Fallback default dev user if authorization header is omitted in local dev
        return get_or_create_dev_user(db, "dev_user_123", "Demo Guardian User", "demo@safeher.app")

    token_type, _, token = authorization.partition(" ")
    if token_type.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Dev Mode check
    if token.startswith("dev-") or not FIREBASE_INITIALIZED:
        # Extract user info from dev token if encoded, or default to demo user
        uid = f"dev_user_{token[-8:]}" if len(token) > 8 else "dev_user_123"
        return get_or_create_dev_user(db, uid, "SafeHer User", "user@safeher.app")

    # 2. Verify with Firebase Admin SDK
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        email = decoded_token.get("email", f"{uid}@safeher.app")
        name = decoded_token.get("name", email.split("@")[0])

        user = db.query(User).filter(User.id == uid).first()
        if not user:
            user = User(id=uid, email=email, name=name)
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    except Exception as exc:
        logger.error(f"Firebase token verification failed: {exc}")
        # In dev environment, fall back gracefully
        if os.getenv("ENV", "development") == "development":
            return get_or_create_dev_user(db, "dev_user_123", "Demo Guardian User", "demo@safeher.app")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_or_create_dev_user(db: Session, uid: str, name: str, email: str) -> User:
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        user = User(id=uid, name=name, email=email, phone="+1-555-0199")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
