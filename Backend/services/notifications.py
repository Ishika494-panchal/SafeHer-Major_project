import logging
from typing import List
from models import User, EmergencyContact

logger = logging.getLogger("safeher.notifications")

def notify_contacts(
    alert_id: str,
    user: User,
    contacts: List[EmergencyContact],
    lat: float = None,
    lng: float = None
):
    """
    Stubbed notification service for sending emergency alerts to trusted contacts.
    Currently logs distress messages to console. Wire real AWS SNS / Twilio SMS here in production.
    """
    location_str = f"https://maps.google.com/?q={lat},{lng}" if (lat and lng) else "Location Pending GPS Fix"
    
    logger.info("=" * 60)
    logger.info(f"🚨 EMERGENCY SOS DISPATCHED FOR USER: {user.name} ({user.email})")
    logger.info(f"🚨 ALERT ID: {alert_id}")
    logger.info(f"📍 GPS TRACKING LINK: {location_str}")
    logger.info(f"📞 NOTIFYING {len(contacts)} GUARDIAN CONTACT(S):")

    if not contacts:
        logger.warning("⚠️  No emergency contacts configured for user!")
    else:
        for contact in contacts:
            sms_body = (
                f"EMERGENCY ALERT: {user.name} has triggered an SOS on SafeHer! "
                f"Live location: {location_str}. Please reach out immediately!"
            )
            logger.info(f"   -> [STUB AWS SNS SMS] To: {contact.name} ({contact.phone}) [{contact.relationship}]")
            logger.info(f"      Message: '{sms_body}'")

    logger.info("=" * 60)

    # Return structured simulation summary for API response log
    return {
        "contacts_notified_count": len(contacts),
        "status": "queued_stub",
        "contacts": [{"name": c.name, "phone": c.phone} for c in contacts]
    }
