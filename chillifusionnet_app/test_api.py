import sys
from pathlib import Path
from fastapi.testclient import TestClient
import io
from PIL import Image

sys.path.append(str(Path(__file__).resolve().parent))

from backend.main import app

client = TestClient(app)

def test_health_check():
    print("Testing GET /api/health...")
    response = client.get("/api/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200

def test_diagnose_valid_image():
    print("\nTesting POST /api/diagnose with valid image...")
    # Create dummy image
    img = Image.new('RGB', (380, 380), color = (73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    response = client.post(
        "/api/diagnose",
        files={"file": ("test_leaf.jpg", img_bytes, "image/jpeg")}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    assert "success" in response.json()
    assert response.json()["success"] == True
    
def test_diagnose_invalid_extension():
    print("\nTesting POST /api/diagnose with invalid extension...")
    response = client.post(
        "/api/diagnose",
        files={"file": ("test_doc.txt", b"dummy content", "text/plain")}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 400

def run_all_tests():
    try:
        test_health_check()
        test_diagnose_invalid_extension()
        test_diagnose_valid_image()
        print("\nAll tests passed successfully!")
    except AssertionError as e:
        print(f"\nTest failed: {e}")

if __name__ == "__main__":
    run_all_tests()
