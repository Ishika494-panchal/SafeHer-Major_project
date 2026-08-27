import sys
import time
import io

# Force stdout encoding to utf-8 for Windows console support
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from database import engine, Base, SessionLocal
import models
import schemas
from routers.sos import trigger_sos, push_location_ping, get_sos_status, cancel_sos
from routers.contacts import create_contact, get_contacts, update_contact, delete_contact

def run_tests():
    print("==================================================")
    print("RUNNING SAFEHER BACKEND UNIT & INTEGRATION TESTS")
    print("==================================================")

    # 1. Initialize Database Tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("[PASS] 1. Database tables initialized successfully (safeher.db).")

    # 2. Setup Test User
    test_uid = "test_user_qa_123"
    user = db.query(models.User).filter(models.User.id == test_uid).first()
    if not user:
        user = models.User(id=test_uid, name="Jane Doe QA", email="jane.qa@safeher.app", phone="+1-555-0199")
        db.add(user)
        db.commit()
        db.refresh(user)
    print(f"[PASS] 2. Test user retrieved/created: {user.name} ({user.id}).")

    # 3. Test SOS Trigger with Latency Benchmark (< 2.0s requirement)
    start_time = time.time()
    sos_payload = schemas.SOSTriggerRequest(user_id=user.id, latitude=37.7749, longitude=-122.4194, battery_percent=95)
    sos_resp = trigger_sos(payload=sos_payload, db=db)
    latency_ms = (time.time() - start_time) * 1000
    print(f"[PASS] 3. SOS Triggered successfully!")
    print(f"   - Alert ID: {sos_resp.id}")
    print(f"   - Status: {sos_resp.status}")
    print(f"   - Triggered At: {sos_resp.triggered_at}")
    print(f"   - Latency: {latency_ms:.2f} ms")
    assert latency_ms < 2000, f"Latency requirement failed: {latency_ms:.2f}ms >= 2000ms"
    print("   - Latency benchmark PASSED (< 2.0 seconds requirement met).")

    # 3b. Test 404 User Validation Failure for Non-existent User
    from fastapi import HTTPException
    try:
        invalid_payload = schemas.SOSTriggerRequest(user_id="non_existent_uuid_999", latitude=10.0, longitude=20.0, battery_percent=50)
        trigger_sos(payload=invalid_payload, db=db)
        assert False, "Should have raised HTTPException 404 for non-existent user"
    except HTTPException as exc:
        assert exc.status_code == 404
        print(f"[PASS] 3b. Non-existent User Validation Test PASSED (HTTP 404 returned correctly).")

    # 4. Test Live Location Ping Push
    ping_payload = schemas.LocationPingRequest(lat=37.7755, lng=-122.4180, battery_pct=94)
    loc_resp = push_location_ping(alert_id=sos_resp.alert_id, payload=ping_payload, db=db, current_user=user)
    print(f"[PASS] 4. Live GPS Ping Pushed! Ping ID: {loc_resp.id}, Lat: {loc_resp.lat}, Lng: {loc_resp.lng}")

    # 5. Test Poll SOS Status & Latest Location
    status_resp = get_sos_status(alert_id=sos_resp.alert_id, db=db, current_user=user)
    print(f"[PASS] 5. SOS Status Polled: Alert Status='{status_resp.status}', History count={len(status_resp.location_history)}")
    assert status_resp.latest_location is not None, "Latest location should not be None"

    # 6. Test SOS Cancellation / Resolution
    cancel_resp = cancel_sos(alert_id=sos_resp.alert_id, db=db, current_user=user)
    print(f"[PASS] 6. SOS Alert Resolved! New Status='{cancel_resp.status}'")

    # 7. Test Emergency Contacts CRUD
    contact_in = schemas.EmergencyContactCreate(name="Mom", phone="+1-555-0100", relationship="Parent")
    created_c = create_contact(payload=contact_in, db=db, current_user=user)
    print(f"[PASS] 7. Created Emergency Contact: {created_c.name} ({created_c.id})")

    contacts = get_contacts(db=db, current_user=user)
    print(f"   - Total contacts for user: {len(contacts)}")

    update_in = schemas.EmergencyContactUpdate(phone="+1-555-0101")
    updated_c = update_contact(contact_id=created_c.id, payload=update_in, db=db, current_user=user)
    print(f"   - Updated contact phone: {updated_c.phone}")

    delete_contact(contact_id=created_c.id, db=db, current_user=user)
    print(f"   - Deleted test contact successfully.")

    db.close()
    print("==================================================")
    print("ALL BACKEND TESTS COMPLETED AND PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()

