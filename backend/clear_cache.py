"""
Clear all server caches and broadcast update to clients.
Run this after manual database changes (like migrations).
"""
import requests

def clear_cache():
    print("=== CLEARING ALL CACHES ===\n")
    
    url = "http://localhost:8000/admin/clear-cache"
    
    try:
        response = requests.post(url)
        print(f"Status Code: {response.status_code}\n")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {data.get('message', 'Cache cleared')}")
            print("\nNow refresh your mobile app to see the changes!")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        print("\nIs the backend running? Start it with: python api.py")

if __name__ == "__main__":
    clear_cache()
