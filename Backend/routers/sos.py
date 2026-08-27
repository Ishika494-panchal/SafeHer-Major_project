from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import User, SOSAlert, LiveLocation, EmergencyContact, SOSStatus
from schemas import (
    SOSTriggerRequest,
    SOSAlertResponse,
    LocationPingRequest,
    SOSStatusResponse,
    LiveLocationResponse
)
from auth import get_current_user
from services.notifications import notify_contacts

router = APIRouter(prefix="/sos", tags=["SOS Emergency"])

@router.post("/trigger", response_model=SOSAlertResponse, status_code=status.HTTP_201_CREATED)
def trigger_sos(
    payload: SOSTriggerRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger an Emergency SOS Distress Alert.

    Academic & Technical Project Flow:
    -----------------------------------
    1. Input Validation:
       FastAPI automatically parses and validates the incoming JSON body against the SOSTriggerRequest Pydantic schema.
       Coordinates (latitude -90..90, longitude -180..180) and battery percentage (0..100) are pre-validated.

    2. User Existence Verification:
       Queries the 'users' table using SQLAlchemy ORM to verify that payload.user_id exists.
       If the user does not exist, an HTTP 404 Not Found exception is raised immediately.

    3. Database Transaction with Error Handling:
       Inserts a new row into the 'sos_alerts' table with status='active' and the current UTC timestamp.
       Wraps database operations inside a try/except block. In case of any database exception,
       db.rollback() is executed to undo pending changes and maintain ACID atomicity, returning an HTTP 500 error.

    4. Response:
       Returns the newly created alert as an SOSAlertResponse model containing id, status, and triggered_at timestamp
       with HTTP status code 201 Created.
    """
    # Step 1: Extract string representation of user_id for DB lookup
    target_user_id = str(payload.user_id)

    # Step 2: Validate user existence in the database (Returns 404 if user is missing)
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{target_user_id}' does not exist."
        )

    # Step 3: Execute database insertion wrapped in try/except with rollback on error
    try:
        # Create a new SOSAlert ORM instance
        new_alert = SOSAlert(
            user_id=target_user_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            battery_percent=payload.battery_percent,
            status=SOSStatus.ACTIVE,
            triggered_at=datetime.utcnow()
        )

        # Stage and commit the new alert to the database
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        # Record initial location ping in live_locations table for real-time tracking history
        initial_loc = LiveLocation(
            alert_id=str(new_alert.id),
            lat=payload.latitude,
            lng=payload.longitude,
            battery_pct=payload.battery_percent,
            timestamp=new_alert.triggered_at
        )
        db.add(initial_loc)
        db.commit()

        # Step 4: Dispatch notifications to emergency contacts (handled gracefully if fail)
        user_contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == target_user_id).all()
        try:
            notify_contacts(
                alert_id=str(new_alert.id),
                user=user,
                contacts=user_contacts,
                lat=payload.latitude,
                lng=payload.longitude
            )
        except Exception as notify_err:
            print(f"[WARNING] Emergency contact notification failed: {notify_err}")

        # Step 5: Return created SOS alert (FastAPI serializes to SOSAlertResponse with 201 Created)
        return SOSAlertResponse(
            id=str(new_alert.id),
            status=str(new_alert.status.value if hasattr(new_alert.status, 'value') else new_alert.status),
            triggered_at=new_alert.triggered_at
        )

    except HTTPException:
        # Re-raise HTTP exceptions (e.g. 404) directly without altering status code
        raise
    except Exception as e:
        # Roll back transaction to restore database to clean state on failure
        db.rollback()
        # Return 500 Internal Server Error with clear error message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while triggering SOS alert: {str(e)}"
        )

@router.post("/{alert_id}/location", response_model=LiveLocationResponse)
def push_location_ping(
    alert_id: str,
    payload: LocationPingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Push a live GPS location ping for an active SOS alert.
    """
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="SOS Alert not found")

    if alert.status != "active":
        raise HTTPException(status_code=400, detail=f"Cannot push location to an alert with status '{alert.status}'")

    location_ping = LiveLocation(
        alert_id=alert.id,
        lat=payload.lat,
        lng=payload.lng,
        battery_pct=payload.battery_pct,
        timestamp=datetime.utcnow()
    )
    db.add(location_ping)
    db.commit()
    db.refresh(location_ping)

    return LiveLocationResponse.from_orm(location_ping)

@router.get("/{alert_id}/status", response_model=SOSStatusResponse)
def get_sos_status(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Poll an SOS alert's status, user details, latest location, and location history.
    """
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="SOS Alert not found")

    user = db.query(User).filter(User.id == alert.user_id).first()

    # Query location history ordered chronologically
    locations = db.query(LiveLocation).filter(
        LiveLocation.alert_id == alert_id
    ).order_by(LiveLocation.timestamp.desc()).all()

    latest_loc = LiveLocationResponse.from_orm(locations[0]) if locations else None
    loc_history = [LiveLocationResponse.from_orm(loc) for loc in locations]

    return SOSStatusResponse(
        alert_id=alert.id,
        user_id=alert.user_id,
        user_name=user.name if user else "SafeHer User",
        user_phone=user.phone if user else None,
        status=alert.status,
        triggered_at=alert.triggered_at,
        resolved_at=alert.resolved_at,
        latest_location=latest_loc,
        location_history=loc_history
    )

@router.post("/{alert_id}/cancel", response_model=SOSAlertResponse)
def cancel_sos(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel or resolve an SOS alert.
    """
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="SOS Alert not found")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    return SOSAlertResponse(
        id=str(alert.id),
        status=str(alert.status.value if hasattr(alert.status, 'value') else alert.status),
        triggered_at=alert.triggered_at
    )
