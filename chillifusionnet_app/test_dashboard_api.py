import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parent))

from backend.main import app

client = TestClient(app)

def test_dashboard():
    print("Testing GET /api/dashboard...")
    response = client.get("/api/dashboard")
    print(f"Status Code: {response.status_code}")
    data = response.json()
    assert response.status_code == 200
    assert "accuracy" in data
    assert "classes" in data
    print("Success: Dashboard returned expected data structure.")

def test_model_info():
    print("\nTesting GET /api/model-info...")
    response = client.get("/api/model-info")
    print(f"Status Code: {response.status_code}")
    data = response.json()
    assert response.status_code == 200
    assert "architecture" in data
    assert "components" in data
    print("Success: Model Info returned expected data structure.")

def test_reports():
    print("\nTesting GET /api/reports...")
    response = client.get("/api/reports")
    print(f"Status Code: {response.status_code}")
    data = response.json()
    assert response.status_code == 200
    assert "evaluation_metrics" in data
    assert "graph_locations" in data
    print("Success: Reports returned expected data structure.")

def run_all_tests():
    try:
        test_dashboard()
        test_model_info()
        test_reports()
        print("\nAll endpoints tested successfully!")
    except AssertionError as e:
        print(f"\nTest failed: {e}")

if __name__ == "__main__":
    run_all_tests()
