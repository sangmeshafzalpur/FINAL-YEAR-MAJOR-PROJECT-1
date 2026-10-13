"""
main.py
FastAPI application entry-point for ChilliFusionNet.

Start locally:
  uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

Start in production (Render):
  uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1
"""

import os
import logging
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config.settings import settings
from .api import diagnosis_router, dashboard_router, model_info_router, reports_router

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Application ─────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Backend inference service for the ChilliFusionNet chilli leaf disease "
        "diagnostic dashboard. Provides disease prediction, Grad-CAM explainability, "
        "dashboard metrics, and saved-report management."
    ),
    version=settings.PROJECT_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────
# Allowed origins are read from the CORS_ORIGINS environment variable.
# Set CORS_ORIGINS on Render to your exact Netlify URL, e.g.:
#   https://chillifusionnet.netlify.app
# For local development the default "*" allows all origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,   # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(diagnosis_router)
app.include_router(dashboard_router)
app.include_router(model_info_router)
app.include_router(reports_router)

# ── Static file mounts ──────────────────────────────────────────────────────
# Serve generated Grad-CAM outputs and showcase evaluation images as static files.
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs(settings.SHOWCASE_DIR, exist_ok=True)

app.mount(
    "/static/outputs",
    StaticFiles(directory=str(settings.OUTPUT_DIR)),
    name="outputs",
)
app.mount(
    "/static/showcase",
    StaticFiles(directory=str(settings.SHOWCASE_DIR)),
    name="showcase",
)

# ── Root health-check ────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """
    Health-check endpoint consumed by Render and frontend status monitors.

    Returns:
      status          : "ok" if API is running (even if model has not loaded yet).
      model_loaded    : true only when the Keras model is fully in memory.
      model_name      : model identifier string from settings.
      classes         : list of recognised class names (empty if model not ready).
    """
    from .services.model_service import model_service

    model_ready = model_service is not None and model_service.model is not None
    return {
        "status": "ok",
        "model_loaded": model_ready,
        "model_name": settings.MODEL_NAME,
        "classes": model_service.class_names if model_ready else [],
        "version": settings.PROJECT_VERSION,
    }


@app.get("/model-info", tags=["Model"])
def model_info_compat():
    """Backward-compatible model info endpoint."""
    from .services.model_service import model_service

    return {
        "model_name": settings.MODEL_NAME,
        "architecture": settings.ARCHITECTURE,
        "input_size": [settings.IMG_SIZE, settings.IMG_SIZE],
        "num_classes": len(model_service.class_names) if (model_service and model_service.class_names) else None,
        "class_names": model_service.class_names if model_service else [],
    }


@app.post("/predict", tags=["Diagnosis"])
async def root_predict(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Root-level /predict alias for backward compatibility with any existing
    clients that POST directly to /predict instead of /api/diagnose.
    """
    from .api.diagnosis import diagnose
    return await diagnose(files=files, file=file)


# ── Startup event ────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    """
    Pre-loads the model and warms up the Grad-CAM tf.function graph at startup
    so that the first real inference request is not slowed by cold-start overhead.
    """
    from .services.model_service import model_service
    from .services.gradcam_service import gradcam_service

    if model_service and model_service.model is not None:
        logger.info("Model already loaded — warming up Grad-CAM graph trace.")
        gradcam_service.warmup()
        logger.info("Startup complete — API is ready to serve predictions.")
    else:
        logger.error(
            "CRITICAL: Model failed to load during startup. "
            "Check that chillifusionnet_final.keras exists at the configured path: "
            f"{settings.MODEL_PATH}"
        )
