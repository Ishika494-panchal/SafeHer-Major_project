import enum
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship as sqlalchemy_relationship
from datetime import datetime
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class SOSStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    contacts = sqlalchemy_relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    alerts = sqlalchemy_relationship("SOSAlert", back_populates="user", cascade="all, delete-orphan")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    relationship = Column(String, nullable=False) # e.g. Parent, Friend, Guardian
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sqlalchemy_relationship("User", back_populates="contacts")

class SOSAlert(Base):
    """
    SQLAlchemy model representing an SOS Distress Alert.
    Stores initial location, battery percentage, status, and timestamps.
    """
    __tablename__ = "sos_alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    battery_percent = Column(Integer, nullable=False, default=100)
    status = Column(SQLEnum(SOSStatus, native_enum=False), default=SOSStatus.ACTIVE, nullable=False, index=True)
    triggered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    user = sqlalchemy_relationship("User", back_populates="alerts")
    locations = sqlalchemy_relationship("LiveLocation", back_populates="alert", cascade="all, delete-orphan", order_by="LiveLocation.timestamp.desc()")

class LiveLocation(Base):
    __tablename__ = "live_locations"

    id = Column(String, primary_key=True, default=generate_uuid)
    alert_id = Column(String, ForeignKey("sos_alerts.id"), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    battery_pct = Column(Integer, nullable=True, default=100)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    alert = sqlalchemy_relationship("SOSAlert", back_populates="locations")
