import requests

API_URL = "http://localhost:8000"

def test_auth():
    print("Testing Auth...")
    
    # 1. Test without token
    print("\n1. Testing without token:")
    try:
        r = requests.get(f"{API_URL}/users/me")
        print(f"Status: {r.status_code}")
        print(f"Body: {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

    # 2. Test with invalid token
    print("\n2. Testing with invalid token:")
    try:
        headers = {"Authorization": "Bearer invalid_token"}
        r = requests.get(f"{API_URL}/users/me", headers=headers)
        print(f"Status: {r.status_code}")
        print(f"Body: {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth()
