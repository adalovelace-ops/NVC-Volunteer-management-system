import os
import json
import firebase_admin
from firebase_admin import credentials, messaging

_firebase_app = None

def init_firebase():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
        
    try:
        # Check if service account is provided via env var as a JSON string
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_account_json:
            cert = json.loads(service_account_json)
            cred = credentials.Certificate(cert)
            _firebase_app = firebase_admin.initialize_app(cred)
            print("[FIREBASE] Initialized via JSON string.")
        else:
            # Check for a file path
            service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                _firebase_app = firebase_admin.initialize_app(cred)
                print(f"[FIREBASE] Initialized via file: {service_account_path}")
            else:
                print("[FIREBASE] WARNING: No service account found. Push notifications will not work.")
    except Exception as e:
        print(f"[FIREBASE] Failed to initialize: {e}")
        
    return _firebase_app

def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Sends a push notification to a specific FCM token.
    """
    if not _firebase_app:
        print("[FIREBASE] App not initialized. Cannot send push notification.")
        return False
        
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=fcm_token,
        )
        response = messaging.send(message)
        print(f"[FIREBASE] Successfully sent message: {response}")
        return True
    except Exception as e:
        print(f"[FIREBASE] Error sending message: {e}")
        return False
