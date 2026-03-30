import sys
import os
import uuid

# Add src to python path so imports in api.py work
sys.path.insert(0, os.path.abspath("src"))

# Now we can safely import the FastAPI app
try:
    from fastapi.testclient import TestClient
    from api import app
except Exception as e:
    print(f"Error importing app: {e}")
    sys.exit(1)

client = TestClient(app)
test_email = f"test_{uuid.uuid4()}@example.com"

print(f"Testing registration for {test_email}...")
res = client.post("/api/auth/register", json={"email": test_email, "password": "password123"})
print("Register:", res.status_code, res.json())

print("\nTesting login...")
res = client.post("/api/auth/login", json={"email": test_email, "password": "password123"})
print("Login:", res.status_code, res.json())

if res.status_code == 200 and "access_token" in res.json():
    print("\nSUCCESS: Registration and Login flow (without email verification) works perfectly!")
else:
    print("\nFAILURE: Something went wrong with the auth flow.")
    sys.exit(1)
