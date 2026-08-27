from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse, UserSync
from auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & User"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current logged-in user profile.
    """
    return current_user

@router.post("/sync", response_model=UserResponse)
def sync_user(
    payload: UserSync,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync user account details from Firebase login into local Database.
    """
    user = db.query(User).filter(User.id == payload.id).first()
    if not user:
        user = User(
            id=payload.id,
            name=payload.name,
            email=payload.email,
            phone=payload.phone
        )
        db.add(user)
    else:
        user.name = payload.name
        user.email = payload.email
        if payload.phone:
            user.phone = payload.phone

    db.commit()
    db.refresh(user)
    return user
