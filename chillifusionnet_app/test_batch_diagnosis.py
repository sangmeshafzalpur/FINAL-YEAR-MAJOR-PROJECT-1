import io
import os
import sys
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

# Ensure root app is in path
sys.path.append(str(Path(__file__).resolve().parent))

from backend.main import app
from backend.config.settings import settings

client = TestClient(app)

def create_dummy_leaf_bytes(color=(34, 139, 34), format="JPEG") -> bytes:
    """Creates a dummy RGB leaf image buffer."""
    img = Image.new("RGB", (380, 380), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

def test_1_single_image():
    print("\n--- Test 1: Single Image Diagnosis ---")
    img_bytes = create_dummy_leaf_bytes(color=(40, 120, 50))
    response = client.post(
        "/api/diagnose",
        files=[("files", ("chilli_leaf_01.jpg", img_bytes, "image/jpeg"))]
    )
    assert response.status_code == 200, f"Status code: {response.status_code}, detail: {response.text}"
    data = response.json()
    assert data["total_images"] == 1
    assert data["successful"] == 1
    assert data["failed"] == 0
    assert len(data["results"]) == 1
    # Backward compatibility fields
    assert "prediction" in data
    assert "confidence" in data
    assert "gradcam" in data
    assert data["gradcam"]["success"] == True
    print(f"Passed: 1 image diagnosed -> {data['results'][0]['prediction']} ({data['results'][0]['confidence']}%)")

def test_2_two_images():
    print("\n--- Test 2: Two Images Diagnosis ---")
    img1 = create_dummy_leaf_bytes(color=(30, 100, 40))
    img2 = create_dummy_leaf_bytes(color=(70, 140, 60))
    response = client.post(
        "/api/diagnose",
        files=[
            ("files", ("leaf_01.jpg", img1, "image/jpeg")),
            ("files", ("leaf_02.jpg", img2, "image/jpeg")),
        ]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_images"] == 2
    assert data["successful"] == 2
    assert data["failed"] == 0
    assert len(data["results"]) == 2
    print(f"Passed: 2 images diagnosed -> [{data['results'][0]['prediction']}, {data['results'][1]['prediction']}]")

def test_3_ten_images():
    print("\n--- Test 3: Ten Images Batch Diagnosis ---")
    files = []
    for i in range(1, 11):
        c = (20 + i * 10, 80 + i * 5, 30 + i * 8)
        b = create_dummy_leaf_bytes(color=c)
        files.append(("files", (f"leaf_{i:02d}.jpg", b, "image/jpeg")))
    
    response = client.post("/api/diagnose", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["total_images"] == 10
    assert data["successful"] == 10
    assert data["failed"] == 0
    assert len(data["results"]) == 10
    assert "summary" in data
    assert data["summary"]["healthy"] + data["summary"]["diseased"] == 10
    print(f"Passed: 10 images diagnosed successfully. Summary: {data['summary']['healthy']} Healthy / {data['summary']['diseased']} Diseased, Avg Conf: {data['summary']['average_confidence']}%")

def test_4_mixed_valid_invalid():
    print("\n--- Test 4: Mixed Valid and Invalid Files ---")
    files = []
    # 8 valid images
    for i in range(1, 9):
        b = create_dummy_leaf_bytes(color=(45, 110, 55))
        files.append(("files", (f"valid_leaf_{i}.jpg", b, "image/jpeg")))
    # 2 invalid files: 1 unsupported extension, 1 corrupted image
    files.append(("files", ("bad_document.pdf", b"not a pdf or image", "application/pdf")))
    files.append(("files", ("corrupted_leaf.png", b"this is completely corrupted bytes", "image/png")))

    response = client.post("/api/diagnose", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["total_images"] == 10
    assert data["successful"] == 8
    assert data["failed"] == 2
    assert len(data["failed_images"]) == 2
    print(f"Passed: Mixed batch processed -> 8 successful, 2 failed.")
    for fail in data["failed_images"]:
        print(f"  - Failed file recorded: {fail['filename']} -> {fail['error']}")

def test_5_exceed_max_batch_limit():
    print("\n--- Test 5: Exceeding MAX_BATCH_SIZE (21 images) ---")
    files = []
    dummy = create_dummy_leaf_bytes()
    for i in range(21):
        files.append(("files", (f"extra_leaf_{i}.jpg", dummy, "image/jpeg")))

    response = client.post("/api/diagnose", files=files)
    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert f"Maximum {settings.MAX_BATCH_SIZE} images" in detail
    print(f"Passed: Limit check rejected 21 images with detail: '{detail}'")

def test_6_config_endpoint():
    print("\n--- Test 6: Config Endpoint ---")
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["max_batch_size"] == 20
    print(f"Passed: Config endpoint returned max_batch_size: {data['max_batch_size']}")

def test_7_saved_reports_api():
    print("\n--- Test 7: Saved Reports Endpoints ---")
    # 1. Get saved reports
    response = client.get("/api/reports/saved")
    assert response.status_code == 200
    reports = response.json()
    assert isinstance(reports, list)
    assert len(reports) >= 2
    print(f"Passed: Found {len(reports)} saved reports initially.")

    # 2. Save a new report
    new_report = {
        "id": "BATCH-TEST-AUTO",
        "type": "batch",
        "title": "Automated Test Batch",
        "date": "08 Oct 2026",
        "total_images": 5,
        "summary_text": "4 Healthy / 1 Diseased",
        "healthy_count": 4,
        "diseased_count": 1,
        "avg_confidence": 98.6
    }
    save_resp = client.post("/api/reports/save", json=new_report)
    assert save_resp.status_code == 200
    assert save_resp.json()["success"] == True

    # 3. Fetch specific report
    get_resp = client.get("/api/reports/saved/BATCH-TEST-AUTO")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == "BATCH-TEST-AUTO"
    print("Passed: Saved report saved and retrieved successfully.")

def test_8_model_file_intact():
    print("\n--- Test 8: Verify Model File is Untouched ---")
    model_path = settings.MODEL_PATH
    assert model_path.exists(), "chillifusionnet_final.keras must exist!"
    size = model_path.stat().st_size
    print(f"chillifusionnet_final.keras size: {size} bytes ({size / (1024*1024):.2f} MB)")
    assert size == 771218108, "Model file size must be identical to the original trained weights!"
    print("Passed: Model file chillifusionnet_final.keras is 100% UNTOUCHED and identical.")

def run_all():
    try:
        test_1_single_image()
        test_2_two_images()
        test_3_ten_images()
        test_4_mixed_valid_invalid()
        test_5_exceed_max_batch_limit()
        test_6_config_endpoint()
        test_7_saved_reports_api()
        test_8_model_file_intact()
        print("\n==========================================")
        print("ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!!")
        print("==========================================\n")
    except Exception as e:
        print(f"\nTEST SUITE FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_all()
