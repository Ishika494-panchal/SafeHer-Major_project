from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID

# --- USER SCHEMAS ---
class UserSync(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- EMERGENCY CONTACT SCHEMAS ---
class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: str

class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None

class EmergencyContactResponse(BaseModel):
    id: str
    user_id: str
    name: str
    phone: str
    relationship: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- SOS & LOCATION SCHEMAS ---
class LocationPingRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    battery_pct: Optional[int] = Field(default=100, ge=0, le=100)

class LiveLocationResponse(BaseModel):
    id: str
    alert_id: str
    lat: float
    lng: float
    battery_pct: Optional[int] = 100
    timestamp: datetime

    class Config:
        from_attributes = True

class SOSTriggerRequest(BaseModel):
    """
    Request schema for triggering an SOS Emergency Alert.
    Validates user existence, latitude (-90 to 90), longitude (-180 to 180), and battery (0 to 100).
    """
    user_id: Union[UUID, str] = Field(..., description="UUID or String ID of the user triggering the SOS alert")
    latitude: float = Field(..., ge=-90.0, le=90.0, alias="lat", description="Latitude coordinate between -90 and 90 degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, alias="lng", description="Longitude coordinate between -180 and 180 degrees")
    battery_percent: int = Field(100, ge=0, le=100, alias="battery_pct", description="Device battery percentage between 0 and 100")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class SOSAlertResponse(BaseModel):
    """
    Response schema returning created SOS alert details.
    Includes id, status, and triggered_at timestamp.
    """
    id: Union[UUID, str] = Field(..., description="Unique UUID identifier for the created SOS alert")
    status: str = Field(..., description="Alert status (active, resolved, cancelled)")
    triggered_at: datetime = Field(..., description="UTC timestamp when the SOS alert was triggered")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    def __init__(self, **data):
        if "alert_id" in data and "id" not in data:
            data["id"] = data["alert_id"]
        super().__init__(**data)

    @property
    def alert_id(self) -> str:
        """Backward compatibility property for alert_id."""
        return str(self.id)

class SOSStatusResponse(BaseModel):
    alert_id: str
    user_id: str
    user_name: str
    user_phone: Optional[str] = None
    status: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    latest_location: Optional[LiveLocationResponse] = None
    location_history: List[LiveLocationResponse] = []

