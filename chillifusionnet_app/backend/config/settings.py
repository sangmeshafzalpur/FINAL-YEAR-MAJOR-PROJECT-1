import pathlib
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ChilliFusionNet Inference API"
    PROJECT_VERSION: str = "1.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Base directories
    BASE_DIR: pathlib.Path = pathlib.Path(__file__).resolve().parent.parent.parent
    BACKEND_DIR: pathlib.Path = BASE_DIR / "backend"
    
    # Model Artifacts
    MODEL_PATH: pathlib.Path = BACKEND_DIR / "chillifusionnet_final.keras"
    CLASS_NAMES_PATH: pathlib.Path = BACKEND_DIR / "class_names.json"
    
    # File locations
    UPLOAD_DIR: pathlib.Path = BACKEND_DIR / "uploads"
    OUTPUT_DIR: pathlib.Path = BACKEND_DIR / "outputs"
    GRADCAM_DIR: pathlib.Path = OUTPUT_DIR / "gradcam"
    HEATMAP_DIR: pathlib.Path = OUTPUT_DIR / "heatmaps"
    REPORT_DIR: pathlib.Path = OUTPUT_DIR / "reports"
    
    # Project Data (Showcase)
    SHOWCASE_DIR: pathlib.Path = BASE_DIR / "chillifusionnet_showcase1"
    PROJECT_DATA_DIR: pathlib.Path = BASE_DIR / "project_data"
    
    # Model specs
    MODEL_NAME: str = "ChilliFusionNet"
    ARCHITECTURE: str = "EfficientNetB4 + CBAM + BiLSTM"
    IMG_SIZE: int = 380
    
    # Security/Validation
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    MAX_BATCH_SIZE: int = 20  # Maximum images per batch diagnosis
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    
    class Config:
        case_sensitive = True

settings = Settings()

# Automatically create directories if they do not exist
for _dir in [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.GRADCAM_DIR, settings.HEATMAP_DIR, settings.REPORT_DIR]:
    os.makedirs(_dir, exist_ok=True)
