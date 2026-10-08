from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config.settings import settings
from .api import diagnosis, model_info
# from .api import dashboard, reports  # Future routes

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend service for the chilli leaf disease diagnostic dashboard.",
    version=settings.PROJECT_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
from .api import diagnosis_router, dashboard_router, model_info_router, reports_router
app.include_router(diagnosis_router)
app.include_router(dashboard_router)
app.include_router(model_info_router)
app.include_router(reports_router)

# Mount outputs for frontend access to static images like heatmaps
import os
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs(settings.SHOWCASE_DIR, exist_ok=True)
app.mount("/static/outputs", StaticFiles(directory=str(settings.OUTPUT_DIR)), name="outputs")
app.mount("/static/showcase", StaticFiles(directory=str(settings.SHOWCASE_DIR)), name="showcase")

# Expose backward compatible root endpoints for any existing client tests that hit /health directly
@app.get("/health")
def health_compat():
    from .services.model_service import model_service
    return {
        "status": "ok" if model_service.model is not None else "model_unavailable",
        "model_loaded": model_service.model is not None,
        "model_load_error": None,
        "classes": model_service.class_names,
    }

@app.get("/model-info")
def model_info_compat():
    from .services.model_service import model_service
    return {
        "model_name": settings.MODEL_NAME,
        "architecture": settings.ARCHITECTURE,
        "input_size": [settings.IMG_SIZE, settings.IMG_SIZE],
        "num_classes": len(model_service.class_names) if model_service.class_names else None,
        "class_names": model_service.class_names,
    }

from typing import List, Optional
from fastapi import UploadFile, File

@app.post("/predict")
async def root_predict(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None)
):
    from .api.diagnosis import diagnose
    return await diagnose(files=files, file=file)

# Ensure model_service is initialized on startup to avoid first-request delays
@app.on_event("startup")
def startup_event():
    from .services.model_service import model_service
    from .services.gradcam_service import gradcam_service
    # Service automatically loads in __init__ due to singleton, but referencing it ensures it's ready.
    _ = model_service.model
    # Warm up GradCAM: caches grad_model and traces the tf.function graph
    gradcam_service.warmup()
