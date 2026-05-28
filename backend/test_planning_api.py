"""Test the adminPlanningCalendars PUT endpoint through the API."""
import urllib.request, json

BASE = "http://127.0.0.1:8000"

# 1. GET current calendars
r = urllib.request.urlopen(f"{BASE}/storage/adminPlanningCalendars", timeout=10)
data = json.loads(r.read())
calendars = data.get("value", data) if isinstance(data, dict) else data
print(f"GET adminPlanningCalendars: {len(calendars) if isinstance(calendars, list) else type(calendars)} items")

# 2. Try PUT (write) with a test calendar
test_payload = json.dumps({"value": [
    {
        "id": "test-api-cal-1",
        "name": "API Test Calendar",
        "color": "#4CAF50",
        "planningItems": [],
        "createdAt": "2026-05-27T00:00:00Z",
        "updatedAt": "2026-05-27T00:00:00Z",
    }
]}).encode()

req = urllib.request.Request(
    f"{BASE}/storage/adminPlanningCalendars",
    data=test_payload,
    headers={"Content-Type": "application/json"},
    method="PUT"
)
try:
    r2 = urllib.request.urlopen(req, timeout=10)
    print(f"PUT adminPlanningCalendars: {r2.status} ✓")

    # 3. Clean up - restore original
    restore = json.dumps({"value": calendars if isinstance(calendars, list) else []}).encode()
    req3 = urllib.request.Request(
        f"{BASE}/storage/adminPlanningCalendars",
        data=restore,
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    urllib.request.urlopen(req3, timeout=10)
    print("Restored original data ✓")
    print("\n✅ adminPlanningCalendars write is FIXED")
except Exception as e:
    print(f"PUT failed: {e}")
