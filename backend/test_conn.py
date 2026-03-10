import requests
import sys

def test_conn(url):
    print(f"Testing {url}...")
    try:
        r = requests.get(url, timeout=5)
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:100]}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_conn("http://127.0.0.1:8000/")
    test_conn("http://localhost:8000/")
