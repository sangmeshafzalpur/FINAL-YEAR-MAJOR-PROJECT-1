"""
settings.py
Application-wide configuration for ChilliFusionNet Backend.

Environment variables (set in Render dashboard or local .env):
  MODEL_PATH          – Absolute path to the .keras model file.
                        Defaults to: <backend_dir>/chillifusionnet_final.keras
  CLASS_NAMES_PATH    – Absolute path to class_names.json.
                        Defaults to: <backend_dir>/class_names.json
  CORS_ORIGINS        – Comma-separated list of allowed frontend origins.
                        Example: https://chillifusionnet.netlify.app,http://localhost:3000
  PORT                – TCP port to listen on (Render sets this automatically).
  UPLOAD_DIR          – Override upload temp directory (useful for Render disk mounts).
  OUTPUT_DIR          – Override outputs directory (set to Render disk mount path for
                        persistent report storage).
"""

import pathlib
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "ChilliFusionNet Inference API"
    PROJECT_VERSION: str = "1.1.0"
    API_V1_STR: str = "/api/v1"

    # ─── Base directories ──────────────────────────────────────────────────────
    # BASE_DIR resolves to: chillifusionnet_app/
    BASE_DIR: pathlib.Path = pathlib.Path(__file__).resolve().parent.parent.parent
    BACKEND_DIR: pathlib.Path = BASE_DIR / "backend"

    # ─── Model Artifacts ───────────────────────────────────────────────────────
    # Can be overridden via MODEL_PATH and CLASS_NAMES_PATH env vars on Render.
    MODEL_PATH: pathlib.Path = BACKEND_DIR / "chillifusionnet_final.keras"
    CLASS_NAMES_PATH: pathlib.Path = BACKEND_DIR / "class_names.json"

    # ─── File locations ────────────────────────────────────────────────────────
    # UPLOAD_DIR and OUTPUT_DIR can point to a Render disk mount for persistence.
    UPLOAD_DIR: pathlib.Path = BACKEND_DIR / "uploads"
    OUTPUT_DIR: pathlib.Path = BACKEND_DIR / "outputs"
    GRADCAM_DIR: pathlib.Path = OUTPUT_DIR / "gradcam"
    HEATMAP_DIR: pathlib.Path = OUTPUT_DIR / "heatmaps"
    REPORT_DIR: pathlib.Path = OUTPUT_DIR / "reports"

    # ─── Project Data (Showcase / Evaluation graphs) ───────────────────────────
    SHOWCASE_DIR: pathlib.Path = BASE_DIR / "chillifusionnet_showcase1"
    PROJECT_DATA_DIR: pathlib.Path = BASE_DIR / "project_data"

    # ─── Model specs ───────────────────────────────────────────────────────────
    MODEL_NAME: str = "ChilliFusionNet"
    ARCHITECTURE: str = "EfficientNetB4 + CBAM + BiLSTM"
    IMG_SIZE: int = 380

    # ─── Security / Validation ─────────────────────────────────────────────────
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024   # 10 MB per file
    MAX_BATCH_SIZE: int = 20                   # Images per batch diagnosis call
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

    # ─── CORS ──────────────────────────────────────────────────────────────────
    # Set CORS_ORIGINS in your Render environment variables to a comma-separated
    # list of allowed frontend URLs.  Example:
    #   https://chillifusionnet.netlify.app,http://localhost:3000
    #
    # If the env var is not set, the default allows all origins ("*") so that
    # local development works out-of-the-box without extra configuration.
    # In production you MUST set this to your exact Netlify URL.
    CORS_ORIGINS: str = "*"

    class Config:
        case_sensitive = True
        # Allow loading from a .env file when present (local dev only)
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list:
        """Returns CORS_ORIGINS as a Python list, supporting wildcard '*'."""
        raw = self.CORS_ORIGINS.strip()
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


settings = Settings()

# ── Automatically create required directories ───────────────────────────────
for _dir in [
    settings.UPLOAD_DIR,
    settings.OUTPUT_DIR,
    settings.GRADCAM_DIR,
    settings.HEATMAP_DIR,
    settings.REPORT_DIR,
]:
    os.makedirs(_dir, exist_ok=True)
