import io
import re
import base64
import logging
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from ..services.prediction_service import PredictionService
from ..services.preprocessing_service import PreprocessingService
from ..services.gradcam_service import gradcam_service
from ..services.model_service import model_service
from ..config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Diagnosis"])

# Validations from settings
ALLOWED_EXTENSIONS = settings.ALLOWED_EXTENSIONS
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE
MAX_BATCH_SIZE = settings.MAX_BATCH_SIZE


def sanitize_filename(filename: Optional[str]) -> str:
    """Sanitizes filename against path traversal and irregular characters."""
    if not filename:
        return "leaf_image.jpg"
    base = Path(filename).name
    # Remove potentially dangerous characters, keep alphanumeric, dot, dash, underscore
    clean = re.sub(r'[^a-zA-Z0-9._-]', '_', base)
    return clean[:100] if clean else "leaf_image.jpg"


@router.get("/config")
def get_diagnosis_config():
    """Returns dynamic configuration for frontend uploader."""
    return {
        "max_batch_size": MAX_BATCH_SIZE,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "allowed_extensions": sorted(list(ALLOWED_EXTENSIONS)),
        "model_name": settings.MODEL_NAME,
        "input_size": settings.IMG_SIZE,
    }


@router.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "ok" if model_service is not None and model_service.model is not None else "model_unavailable"
    }


@router.post("/diagnose")
async def diagnose(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Accepts single or multiple chilli leaf images, validates each independently,
    and returns predictions, explainability overlays, and batch summary.
    """
    # Collect all uploaded files into a unified list
    upload_list: List[UploadFile] = []
    if files:
        upload_list.extend(files)
    if file:
        upload_list.append(file)

    if not upload_list:
        raise HTTPException(status_code=400, detail="No image file provided.")

    # 1. Validate Maximum Batch Size
    if len(upload_list) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_BATCH_SIZE} images can be tested at once."
        )

    # 2. Check single invalid file extension for immediate 400 compatibility
    if len(upload_list) == 1:
        single_fname = (upload_list[0].filename or "").lower()
        if not any(single_fname.endswith(ext.lower()) for ext in ALLOWED_EXTENSIONS):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed extensions are: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

    results = []
    failed_images = []
    valid_items = []  # tuples of (idx, safe_name, file_bytes, img_tensor, thumb_b64)

    class_names = model_service.get_class_names() if model_service else []

    # 3. Individual Image Validation & Preprocessing
    for idx, upload_file in enumerate(upload_list):
        safe_name = sanitize_filename(upload_file.filename)
        ext = Path(safe_name).suffix.lower()

        # Check extension
        if not any(safe_name.lower().endswith(allowed_ext.lower()) for allowed_ext in ALLOWED_EXTENSIONS):
            failed_images.append({
                "filename": safe_name,
                "error": f"{safe_name} could not be processed because the image format '{ext}' is unsupported."
            })
            continue

        try:
            file_bytes = await upload_file.read()

            # Check file size
            if len(file_bytes) == 0:
                failed_images.append({
                    "filename": safe_name,
                    "error": f"{safe_name} could not be processed because the file is empty."
                })
                continue

            if len(file_bytes) > MAX_FILE_SIZE:
                failed_images.append({
                    "filename": safe_name,
                    "error": f"{safe_name} exceeds the maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB."
                })
                continue

            # Verify image integrity with PIL
            try:
                pil_img = Image.open(io.BytesIO(file_bytes))
                pil_img.verify()
            except (UnidentifiedImageError, Exception):
                failed_images.append({
                    "filename": safe_name,
                    "error": f"{safe_name} could not be processed because the image is invalid or corrupted."
                })
                continue

            # Preprocess for model
            try:
                img_tensor = PreprocessingService.preprocess_image(file_bytes)
            except ValueError as ve:
                failed_images.append({
                    "filename": safe_name,
                    "error": f"{safe_name}: {str(ve)}"
                })
                continue

            # Generate thumbnail preview
            try:
                thumb = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                thumb.thumbnail((400, 400))
                thumb_buf = io.BytesIO()
                thumb.save(thumb_buf, format="JPEG", quality=80)
                thumb_b64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_buf.getvalue()).decode('utf-8')}"
            except Exception:
                thumb_b64 = ""

            valid_items.append((idx, safe_name, file_bytes, img_tensor, thumb_b64))

        except Exception as exc:
            logger.error(f"Error reading {safe_name}: {exc}")
            failed_images.append({
                "filename": safe_name,
                "error": f"{safe_name} encountered an error during reading."
            })

    # If single upload and it failed validation, raise 400
    if len(upload_list) == 1 and not valid_items:
        err_msg = failed_images[0]["error"] if failed_images else "Invalid image upload."
        raise HTTPException(status_code=400, detail=err_msg)

    # 4. Model Prediction
    if valid_items:
        try:
            tensors = [item[3] for item in valid_items]
            predictions = PredictionService.predict_batch_tensors(tensors)
        except RuntimeError as re:
            raise HTTPException(status_code=503, detail=str(re))
        except Exception as exc:
            logger.error(f"Inference error: {exc}")
            raise HTTPException(status_code=500, detail="An internal error occurred during prediction.")

        # 5. Build results & Grad-CAM per valid item (concurrent for speed)
        from concurrent.futures import ThreadPoolExecutor, as_completed

        def _generate_gradcam_for_item(item_tuple):
            """Generate Grad-CAM for a single valid item — called in parallel."""
            i, orig_idx, safe_name, file_bytes, img_tensor, thumb_b64 = item_tuple
            gradcam_result = {"success": False, "error": "Not initialized"}
            try:
                pred_class = predictions[i]["predicted_class"]
                pred_idx = class_names.index(pred_class) if pred_class in class_names else None
                gradcam_result = gradcam_service.generate_gradcam_overlay(file_bytes, img_tensor, pred_idx)
                if not gradcam_result.get("gradcam_base64"):
                    gradcam_result["gradcam_base64"] = gradcam_result.get("overlay_base64")
            except Exception as e:
                logger.error(f"Grad-CAM failed for {safe_name}: {e}")
                gradcam_result = {"success": False, "error": str(e)}
            return i, gradcam_result

        # Run Grad-CAM concurrently (OpenCV overlay work releases GIL)
        gradcam_results_map = {}
        work_items = [
            (i, orig_idx, safe_name, file_bytes, img_tensor, thumb_b64)
            for i, (orig_idx, safe_name, file_bytes, img_tensor, thumb_b64) in enumerate(valid_items)
        ]
        max_workers = min(4, len(work_items)) if work_items else 1
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(_generate_gradcam_for_item, item): item for item in work_items}
            for future in as_completed(futures):
                idx, gcam_result = future.result()
                gradcam_results_map[idx] = gcam_result

        for i, (orig_idx, safe_name, file_bytes, img_tensor, thumb_b64) in enumerate(valid_items):
            pred_data = predictions[i]
            pred_class = pred_data["predicted_class"]
            confidence = pred_data["confidence"]
            all_probs = pred_data["all_probabilities"]

            meta = PredictionService.get_disease_metadata(pred_class)
            gradcam_result = gradcam_results_map.get(i, {"success": False, "error": "Not generated"})

            conf_percent = round(confidence * 100, 2)
            results.append({
                "id": f"leaf_{orig_idx + 1}",
                "filename": safe_name,
                "prediction": meta["display_name"],
                "predicted_class": pred_class,
                "confidence": conf_percent,
                "confidence_raw": confidence,
                "status": meta["status"],
                "is_healthy": meta["is_healthy"],
                "category": meta["category"],
                "description": meta["observation"],
                "recommendation": meta["recommendation"],
                "probabilities": all_probs,
                "gradcam": gradcam_result,
                "thumbnail_base64": thumb_b64
            })

    # 6. Compute Batch Summary
    total_count = len(upload_list)
    successful_count = len(results)
    failed_count = len(failed_images)

    healthy_count = sum(1 for r in results if r["is_healthy"])
    diseased_count = sum(1 for r in results if not r["is_healthy"])

    avg_conf = round(sum(r["confidence"] for r in results) / successful_count, 2) if successful_count > 0 else 0.0

    # Class distribution
    distribution = {cls: 0 for cls in class_names}
    disease_counts = {}
    for r in results:
        p_raw = r["predicted_class"]
        distribution[p_raw] = distribution.get(p_raw, 0) + 1
        if not r["is_healthy"]:
            disease_counts[r["prediction"]] = disease_counts.get(r["prediction"], 0) + 1

    if disease_counts:
        most_detected = max(disease_counts, key=disease_counts.get)
    elif healthy_count > 0:
        most_detected = "Healthy"
    else:
        most_detected = "None"

    summary = {
        "total_images": total_count,
        "successful": successful_count,
        "failed": failed_count,
        "healthy": healthy_count,
        "diseased": diseased_count,
        "average_confidence": avg_conf,
        "most_detected_disease": most_detected,
        "distribution": distribution
    }

    # 7. Construct Response
    response_payload = {
        "success": successful_count > 0,
        "total_images": total_count,
        "successful": successful_count,
        "failed": failed_count,
        "results": results,
        "failed_images": failed_images,
        "summary": summary
    }

    # Backward compatibility for single image requests
    if total_count == 1 and successful_count == 1:
        first = results[0]
        response_payload["prediction"] = first["predicted_class"]
        response_payload["confidence"] = first["confidence_raw"]
        response_payload["probabilities"] = first["probabilities"]
        response_payload["gradcam"] = first["gradcam"]

    return JSONResponse(content=response_payload)


# Route aliases for /predict and /api/predict
@router.post("/predict")
async def predict_alias(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """Alias for /api/diagnose supporting multiple or single files."""
    return await diagnose(files=files, file=file)
