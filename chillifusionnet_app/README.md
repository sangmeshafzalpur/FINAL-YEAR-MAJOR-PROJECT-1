# ChilliFusionNet — Chilli Leaf Disease Detection System

An explainable deep-learning system for intelligent chilli leaf disease diagnosis.
Combines EfficientNetB4 + CBAM attention + BiLSTM for high-accuracy multi-class classification
with Grad-CAM visual explanations.

---

## Architecture Overview

```
MAJOR-PROJECT-FINAL-YEAR/
└── chillifusionnet_app/
    ├── frontend/          ← Static HTML/CSS/JS → deployed on Netlify
    ├── backend/           ← FastAPI + TensorFlow → deployed on Render
    ├── project_data/      ← Evaluation metrics, training history (JSON)
    ├── chillifusionnet_showcase1/  ← Evaluation graphs (PNG)
    ├── render.yaml        ← Render deployment configuration
    ├── netlify.toml       ← Netlify deployment configuration
    └── README.md          ← This file
```

### Deployment Targets

| Layer | Platform | Cost |
|-------|----------|------|
| Frontend | Netlify (static) | Free tier |
| Backend API | Render Web Service | Free tier (with cold-start) |
| Database | JSON file (diagnosis_history.json) | No cost |
| Model storage | Git LFS (771 MB) | GitHub LFS quota |

---

## Model

- **File:** `backend/chillifusionnet_final.keras`
- **Size:** ~771 MB
- **Architecture:** EfficientNetB4 backbone + CBAM attention + BiLSTM sequence modeling
- **Classes:** cercospora, healthy, mites_and_trips, nutritional, powdery mildew
- **Input:** 380 × 380 RGB images
- **Tracked via:** Git LFS (see `.gitattributes`)

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Git with Git LFS

```powershell
# 1. Install Git LFS
winget install --id Git.GitLFS -e
git lfs install

# 2. Clone the repository
git clone https://github.com/YOUR-USERNAME/MAJOR-PROJECT-FINAL-YEAR.git
cd "MAJOR-PROJECT-FINAL-YEAR"

# 3. Pull the LFS model file
git lfs pull
```

### Start the Backend

```powershell
cd chillifusionnet_app

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Start the server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at: http://localhost:8000  
✅ Swagger UI at: http://localhost:8000/docs  
✅ Health check: http://localhost:8000/health  

### Start the Frontend

In a new terminal:

```powershell
# Option A — Python server (no extra tools needed)
cd chillifusionnet_app/frontend
python -m http.server 3000

# Option B — VS Code Live Server (install the extension, then right-click index.html)
```

✅ Frontend running at: http://localhost:3000

---

## Deployment Guide

### Step 1 — Prepare GitHub Repository

```powershell
# Ensure Git LFS is tracking the model
git lfs track "chillifusionnet_app/backend/chillifusionnet_final.keras"
git add .gitattributes

# Stage all changes (excluding venv and .env via .gitignore)
git add .
git commit -m "chore: prepare for production deployment"

# Push to GitHub (Git LFS will upload the model automatically)
git push origin main
```

> ⚠️ **First push with LFS:** GitHub LFS has a 1 GB free storage limit.
> The model is 771 MB — this will consume most of your free quota.
> Consider using a dedicated model hosting service (HuggingFace Hub, Google Drive)
> and downloading during Render build if LFS quota is a concern.

---

### Step 2 — Deploy Backend to Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub account and select your repository
3. Render will detect `chillifusionnet_app/render.yaml`
4. Confirm these settings:
   - **Root Directory:** `chillifusionnet_app`
   - **Build Command:** `pip install --no-cache-dir -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT --workers 1`
   - **Health Check Path:** `/health`
5. Add these **Environment Variables** in Render dashboard:

   | Key | Value |
   |-----|-------|
   | `CORS_ORIGINS` | `https://YOUR-SITE.netlify.app` *(update after Step 3)* |
   | `PYTHONUNBUFFERED` | `1` |
   | `TF_CPP_MIN_LOG_LEVEL` | `2` |
   | `TF_FORCE_GPU_ALLOW_GROWTH` | `true` |

6. Click **Deploy** — first build takes 8–15 minutes (model download + TF install)
7. After deployment, copy your Render URL (e.g. `https://chillifusionnet-backend.onrender.com`)

✅ Test: `https://YOUR-RENDER-URL.onrender.com/health`

---

### Step 3 — Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Connect your GitHub repository
3. Netlify reads `chillifusionnet_app/netlify.toml` automatically:
   - **Base directory:** `chillifusionnet_app`
   - **Build command:** *(from netlify.toml)*
   - **Publish directory:** `frontend`
4. Add this **Environment Variable** in Netlify dashboard:

   | Key | Value |
   |-----|-------|
   | `API_BASE_URL` | `https://YOUR-RENDER-URL.onrender.com` |

5. Click **Deploy site** — builds in ~30 seconds
6. Copy your Netlify URL (e.g. `https://chillifusionnet.netlify.app`)

---

### Step 4 — Update CORS on Render

1. Go back to Render dashboard → Your web service → **Environment**
2. Update `CORS_ORIGINS` to your actual Netlify URL:
   ```
   https://chillifusionnet.netlify.app
   ```
3. Click **Save changes** — Render redeploys automatically

---

### Step 5 — Verify Deployment

Run these checks:

```
✅ https://YOUR-RENDER-URL.onrender.com/health          → {"status":"ok","model_loaded":true,...}
✅ https://YOUR-NETLIFY-SITE.netlify.app/                → Landing page loads
✅ https://YOUR-NETLIFY-SITE.netlify.app/diagnosis.html → Diagnosis page loads
✅ Upload a chilli leaf image → Prediction + Grad-CAM returned
✅ Dashboard page loads metrics from backend
✅ Reports page shows saved diagnosis history
```

---

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | ✅ Yes | `*` | Comma-separated allowed frontend origins |
| `PORT` | Auto | Set by Render | TCP port (Render injects this) |
| `PYTHONUNBUFFERED` | Recommended | `1` | Flush logs to Render dashboard immediately |
| `TF_CPP_MIN_LOG_LEVEL` | Recommended | `2` | Reduce TF verbose output |
| `TF_FORCE_GPU_ALLOW_GROWTH` | Recommended | `true` | Prevent TF from grabbing all memory |
| `MODEL_PATH` | Optional | *(auto)* | Override if model is stored elsewhere |

### Frontend (Netlify)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | ✅ Yes | Your Render backend URL (injected at build time) |

---

## Troubleshooting

### Backend startup failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FileNotFoundError: chillifusionnet_final.keras` | Model not downloaded from LFS | Run `git lfs pull` and re-push |
| `RuntimeError: Model is currently unavailable` | Model failed to load | Check Render logs for TF errors |
| Port binding error | Wrong start command | Ensure command uses `$PORT` |
| Build takes 15+ min | TF install + model download | Normal on first deploy |

### CORS errors

| Symptom | Fix |
|---------|-----|
| `Access-Control-Allow-Origin` missing | Set `CORS_ORIGINS` in Render to exact Netlify URL |
| Works locally but not in production | Netlify URL must match exactly (no trailing slash) |

### HTTP 404 errors

| Symptom | Fix |
|---------|-----|
| API routes return 404 | Verify start command path: `backend.main:app` (from `chillifusionnet_app/`) |
| Static files 404 on Netlify | Verify `publish = "frontend"` in netlify.toml |
| CSS/JS not loading | Check paths are relative in HTML (no leading `/`) |

### HTTP 500 errors

| Symptom | Fix |
|---------|-----|
| `500` on `/api/diagnose` | Check Render logs; model may have failed to load |
| Grad-CAM returns `success: false` | Confirm `top_activation` layer exists in model |
| Dashboard returns empty data | Verify `project_data/` directory is committed |

### Cold start (Render free tier)

Render free-tier services spin down after 15 minutes of inactivity.  
The first request after inactivity can take **30–60 seconds** (model loading).

**Solutions:**
- Upgrade to Render Starter ($7/month) for always-on service
- Use an external ping service (e.g. UptimeRobot) to keep the service warm
- Add a "Connecting to backend..." spinner in the frontend (already implemented in diagnosis.js)

---

## Git Commands

```powershell
# Initial setup
git init
git lfs install
git lfs track "chillifusionnet_app/backend/chillifusionnet_final.keras"
git add .gitattributes

# Add all files
git add .
git commit -m "Initial commit: ChilliFusionNet production-ready"

# Add GitHub remote and push
git remote add origin https://github.com/YOUR-USERNAME/MAJOR-PROJECT-FINAL-YEAR.git
git push -u origin main

# After making changes
git add .
git commit -m "fix: update CORS configuration"
git push
```

---

## License

See `LICENSE` file.