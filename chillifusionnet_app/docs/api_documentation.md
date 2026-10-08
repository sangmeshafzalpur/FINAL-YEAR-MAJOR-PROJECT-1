# API Documentation

The ChilliFusionNet backend exposes several RESTful API endpoints via FastAPI. These endpoints serve the frontend client, enabling image diagnosis and populating the analytics dashboards.

## Base URL
When running locally, the base URL is: `http://localhost:8000`

---

## 1. Diagnose Image
`POST /api/diagnose`

Accepts an image upload, processes it through the ChilliFusionNet model, and returns the classification results alongside Explainable AI (Grad-CAM) visualizations.

**Request:**
- Content-Type: `multipart/form-data`
- Body Parameter: `file` (binary image data: jpg, png, webp)

**Response (JSON):**
```json
{
  "prediction": "Healthy",
  "confidence": 0.9987,
  "probabilities": {
    "Cercospora": 0.0001,
    "Healthy": 0.9987,
    "Mites_and_trips": 0.0010,
    "Nutritional": 0.0001,
    "Powdery mildew": 0.0001
  },
  "gradcam": {
    "success": true,
    "gradcam_base64": "data:image/jpeg;base64,...",
    "heatmap_base64": "data:image/jpeg;base64,...",
    "overlay_base64": "data:image/jpeg;base64,..."
  }
}
```

---

## 2. Dashboard Metrics
`GET /api/dashboard`

Retrieves high-level metadata and KPIs required for the main analytics dashboard.

**Response (JSON):**
```json
{
  "model_name": "ChilliFusionNet",
  "architecture": "EfficientNetB4 + CBAM + BiLSTM",
  "accuracy": 0.9987,
  "classes": ["cercospora", "healthy", "mites_and_trips", "nutritional", "powdery mildew"],
  "dataset_size": 22250,
  "training_samples": 17800,
  "validation_samples": 2225,
  "test_samples": 2225,
  "best_epoch": 32,
  "input_resolution": "380x380x3"
}
```

---

## 3. Reports & Analytics
`GET /api/reports`

Retrieves deep training history, detailed classification metrics, and paths to static graphical resources.

**Response (JSON):**
```json
{
  "training_history": {
    "epoch": [1, 2, ...],
    "train_accuracy": [0.64, 0.77, ...],
    "validation_accuracy": [...],
    "train_loss": [...],
    "validation_loss": [...]
  },
  "evaluation_metrics": {
    "test_accuracy": 0.9987,
    "macro_precision": 0.9987,
    "macro_recall": 0.9984,
    "macro_f1": 0.9985,
    "macro_auc": 1.0,
    "macro_sensitivity": 0.9984,
    "macro_specificity": 0.9997
  },
  "confusion_matrix": [
    [null, "cercospora", "healthy", ...],
    ["cercospora", "620", "0", ...]
  ],
  "graph_locations": {
    "accuracy_curve": "/static/showcase/accuracy_curve.png",
    "roc_curve": "/static/showcase/roc_curve.png",
    "gradcam_examples": "/static/showcase/gradcam_examples.png"
  }
}
```

---

## 4. Health Check
`GET /health`

A backward-compatible endpoint to verify the server status and ensure the machine learning model is loaded into memory.

**Response (JSON):**
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_load_error": null,
  "classes": ["cercospora", "healthy", "mites_and_trips", "nutritional", "powdery mildew"]
}
```
