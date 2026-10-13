# ChilliFusionNet Backend

FastAPI inference service for the ChilliFusionNet chilli leaf disease detection system.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI 0.115 |
| ML Runtime | TensorFlow-CPU 2.17 |
| Model | EfficientNetB4 + CBAM + BiLSTM (.keras) |
| Image Processing | Pillow, OpenCV-Headless |
| Server | Uvicorn |
| Deployment | Render Web Service |

## Directory Structure

```
backend/
├── api/
│   ├── __init__.py         # Router registry
│   ├── diagnosis.py        # POST /api/diagnose  (single + batch prediction)
│   ├── dashboard.py        # GET  /api/dashboard
│   ├── model_info.py       # GET  /api/model-info
│   └── reports.py          # GET/POST /api/reports/*
├── config/
│   ├── constants.py        # Disease metadata constants
│   └── settings.py         # Pydantic-settings with env-var support
├── services/
│   ├── model_service.py    # Singleton model loader + custom Keras layers
│   ├── prediction_service.py
│   ├── gradcam_service.py  # Grad-CAM heatmap generation
│   ├── preprocessing_service.py
│   └── report_service.py   # JSON-based diagnosis history
├── utils/
│   └── file_utils.py
├── chillifusionnet_final.keras  # Trained model (771 MB, tracked via Git LFS)
├── class_names.json
├── requirements.txt
└── .env.example
```

## Local Development

### 1. Prerequisites

- Python 3.11+
- Git LFS (for the model file)

```powershell
# Install Git LFS (Windows)
winget install --id Git.GitLFS -e
git lfs install
git lfs pull    # Downloads the model file
```

### 2. Create virtual environment

```powershell
cd chillifusionnet_app
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
pip install -r backend/requirements.txt
```

### 4. Configure environment (optional for local dev)

```powershell
copy backend\.env.example backend\.env
# Edit backend/.env if needed
```

### 5. Start the server

```powershell
# From chillifusionnet_app/ directory
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Open: http://localhost:8000/docs (interactive Swagger UI)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + model status |
| GET | `/model-info` | Model architecture info |
| GET | `/docs` | Interactive API documentation |
| POST | `/predict` | Single/batch prediction (alias) |
| GET | `/api/config` | Upload constraints |
| POST | `/api/diagnose` | Single or batch diagnosis with Grad-CAM |
| POST | `/api/predict` | Alias for /api/diagnose |
| GET | `/api/dashboard` | Dashboard metrics |
| GET | `/api/model-info` | Model info |
| GET | `/api/reports` | Evaluation reports |
| GET | `/api/reports/saved` | Saved diagnosis history |
| GET | `/api/reports/saved/{id}` | Specific saved report |
| POST | `/api/reports/save` | Save a diagnosis report |
| GET | `/static/outputs/...` | Served Grad-CAM images |
| GET | `/static/showcase/...` | Served evaluation graphs |

## Render Deployment

See `render.yaml` in the parent directory for the full Render configuration.

**Environment variables to set in Render dashboard:**

| Variable | Description | Example |
|----------|-------------|---------|
| `CORS_ORIGINS` | Allowed frontend URL | `https://chillifusionnet.netlify.app` |
| `TF_CPP_MIN_LOG_LEVEL` | TF log verbosity | `2` |
| `PYTHONUNBUFFERED` | Flush logs immediately | `1` |

**Important:** The model file (771 MB) is tracked via Git LFS.  
Render downloads Git LFS files automatically. Ensure your GitHub repo has LFS enabled.

## Model File Strategy

The `chillifusionnet_final.keras` file is **771 MB**.

| Option | How |
|--------|-----|
| **Git LFS** (current, recommended) | File is in `.gitattributes`, Render downloads it via LFS |
| **Download at build time** | Uncomment the wget/curl command in `render.yaml` `buildCommand` |
| **Render disk mount** | Store on persistent disk, set `MODEL_PATH` env var |

## Troubleshooting

**Model not loading on Render:**
- Check Render build logs for `git lfs pull` output
- Verify the model file is tracked: `git lfs ls-files`
- Check `MODEL_PATH` setting matches actual file location

**CORS errors from frontend:**
- Set `CORS_ORIGINS` to your exact Netlify URL in Render environment variables
- No trailing slash in the URL

**Out-of-memory errors:**
- Use `tensorflow-cpu` (already in requirements.txt)
- Set `workers=1` in the start command (already configured)
- Consider upgrading Render plan for more RAM

**Cold start / slow first request:**
- Render free tier spins down after 15 minutes of inactivity
- The startup warmup pre-loads the model and traces the Grad-CAM tf.function
- Upgrade to Render Starter ($7/month) for always-on service
