"""Get the actual 500 error message from the API."""
import urllib.request, urllib.error, json

BASE = "http://127.0.0.1:8000"

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
    urllib.request.urlopen(req, timeout=10)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Status: {e.code}")
    print(f"Error body: {body}")
