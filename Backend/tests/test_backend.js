// Automated end-to-end integration test for SafeHer Express Backend
const BASE_URL = 'http://127.0.0.1:8000';

const runTests = async () => {
  console.log('🧪 Starting SafeHer Node.js / Express Backend Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    // 1. Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthRes = await fetch(`${BASE_URL}/`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returns 200 OK');
    assert(healthData.status === 'online', 'Health check reports status online');

    // 2. Auth Sync
    console.log('\n2️⃣ Testing Auth Sync & Current User...');
    const testUserId = `test_node_user_${Date.now()}`;
    const syncRes = await fetch(`${BASE_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-token-${testUserId}`
      },
      body: JSON.stringify({
        id: testUserId,
        name: 'Node Test User',
        email: `${testUserId}@safeher.app`,
        phone: '+1-555-9988'
      })
    });
    const syncData = await syncRes.json();
    assert(syncRes.status === 200, 'Auth sync returns 200');
    assert(syncData.id === testUserId, 'Auth sync returns correct user ID');

    // 3. Emergency Contacts CRUD
    console.log('\n3️⃣ Testing Emergency Contacts CRUD...');
    const createContactRes = await fetch(`${BASE_URL}/contacts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-token-${testUserId}`
      },
      body: JSON.stringify({
        name: 'Jane Guardian',
        phone: '+1-555-1122',
        relationship: 'Sister'
      })
    });
    const contactData = await createContactRes.json();
    assert(createContactRes.status === 201, 'Create contact returns 201 Created');
    assert(contactData.name === 'Jane Guardian', 'Created contact has correct name');

    const getContactsRes = await fetch(`${BASE_URL}/contacts/`, {
      headers: { 'Authorization': `Bearer dev-token-${testUserId}` }
    });
    const contactsList = await getContactsRes.json();
    assert(getContactsRes.status === 200, 'Get contacts returns 200');
    assert(Array.isArray(contactsList) && contactsList.length >= 1, 'Contacts list contains added contact');

    // 4. SOS Trigger, Location Ping & Status
    console.log('\n4️⃣ Testing SOS Distress & Live Location Streaming...');
    const sosTriggerRes = await fetch(`${BASE_URL}/sos/trigger`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-token-${testUserId}`
      },
      body: JSON.stringify({
        latitude: 28.6139,
        longitude: 77.2090,
        battery_percent: 85
      })
    });
    const sosData = await sosTriggerRes.json();
    assert(sosTriggerRes.status === 201, 'SOS Trigger returns 201 Created');
    assert(sosData.status === 'active', 'SOS Alert status is active');
    const alertId = sosData.alertId || sosData.id;

    // Push Location Ping
    const pingRes = await fetch(`${BASE_URL}/sos/${alertId}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-token-${testUserId}`
      },
      body: JSON.stringify({
        lat: 28.6145,
        lng: 77.2098,
        batteryPct: 84
      })
    });
    assert(pingRes.status === 200, 'Push location ping returns 200');

    // Get SOS Status
    const statusRes = await fetch(`${BASE_URL}/sos/${alertId}/status`, {
      headers: { 'Authorization': `Bearer dev-token-${testUserId}` }
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, 'Get SOS status returns 200');
    const history = statusData.locationHistory || statusData.location_history || [];
    assert(history.length >= 2, 'Location history includes initial + updated pings');

    // Cancel SOS
    const cancelRes = await fetch(`${BASE_URL}/sos/${alertId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer dev-token-${testUserId}` }
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200, 'Cancel SOS returns 200');
    assert(cancelData.status === 'cancelled' || cancelData.status === 'resolved', 'SOS status is cancelled/resolved');

    // 5. Incident Reporting & Moderation
    console.log('\n5️⃣ Testing Anonymous Incident Reporting & Moderation...');
    const formData = new FormData();
    formData.append('category', 'stalking');
    formData.append('lat', '28.6150');
    formData.append('lng', '77.2100');
    formData.append('description', 'Suspicious activity near bus terminal at night');

    const reportRes = await fetch(`${BASE_URL}/reports/`, {
      method: 'POST',
      body: formData
    });
    const reportData = await reportRes.json();
    assert(reportRes.status === 201, 'Submit anonymous report returns 201');
    assert(reportData.category === 'stalking', 'Report category is stalking');
    const reportId = reportData.id;

    // Moderate report to approved
    const modRes = await fetch(`${BASE_URL}/reports/${reportId}/moderate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    const modData = await modRes.json();
    assert(modRes.status === 200, 'Moderate report returns 200');
    assert(modData.status === 'approved', 'Report is approved');

    // 6. Heatmap & Danger Zones
    console.log('\n6️⃣ Testing Danger Zone Heatmap GeoJSON...');
    const heatmapRes = await fetch(`${BASE_URL}/heatmap/`);
    const heatmapData = await heatmapRes.json();
    assert(heatmapRes.status === 200, 'Heatmap endpoint returns 200');
    assert(heatmapData.type === 'FeatureCollection', 'Heatmap returns valid GeoJSON FeatureCollection');
    assert(Array.isArray(heatmapData.danger_zones), 'Danger zones array is present');

    // 7. Safe Route Computation (Dijkstra)
    console.log('\n7️⃣ Testing Safe Route Recommendation Engine...');
    const routeRes = await fetch(
      `${BASE_URL}/routes/?origin_lat=28.6139&origin_lng=77.2090&dest_lat=28.6200&dest_lng=77.2150`
    );
    const routeData = await routeRes.json();
    assert(routeRes.status === 200, 'Routes recommendation returns 200');
    assert(routeData.fastest && routeData.shortest && routeData.safest, 'Returns all 3 routes (fastest, shortest, safest)');
    assert(routeData.safest.coordinates.length > 2, 'Safest route has navigable coordinates');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  }
};

runTests();
