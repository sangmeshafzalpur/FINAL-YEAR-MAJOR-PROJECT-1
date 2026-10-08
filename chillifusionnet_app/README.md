# ChilliFusionNet
**AI-Powered Chilli Leaf Disease Detection Dashboard**

ChilliFusionNet is a professional, full-stack machine learning application designed to identify diseases, pest damage, and nutritional deficiencies in chilli leaves with exceptional accuracy (99.87%). Built around a hybrid deep learning architecture—combining an `EfficientNetB4` backbone with `CBAM` (Convolutional Block Attention Module) and `BiLSTM`—the project provides an intuitive and highly interactive diagnostic dashboard tailored for agricultural research, demonstration, and final-year academic viva presentations.

---

## 🌟 Key Features
- **High-Accuracy Diagnostics**: Powered by a robust hybrid architecture achieving 99.87% test accuracy on 5 distinct leaf conditions.
- **Explainable AI (Grad-CAM)**: Generates highly accurate visual heatmaps (utilizing the JET colormap) to highlight the precise regions of the leaf that influenced the model's prediction, ensuring diagnostic transparency.
- **Interactive UI**: A stunning, modern, and responsive interface built with dark glassmorphism design principles, featuring dynamic Chart.js metric visualizations.
- **Modular Backend Architecture**: A production-ready FastAPI backend structured for scalability and rapid inference.

---

## 🏗️ Architecture

### Model Architecture (`ChilliFusionNet`)
- **Backbone**: EfficientNetB4 (Robust hierarchical spatial feature extraction).
- **Attention Mechanism**: CBAM (Sequential Channel and Spatial Attention).
- **Sequence Modeling**: BiLSTM (Captures complex spatial dependencies).
- **Input Resolution**: 380x380x3.
- **Output**: 5 target classes.

### System Architecture
- **Backend**: Python 3.9+, FastAPI, TensorFlow/Keras, OpenCV.
- **Frontend**: Vanilla HTML5, CSS3, JavaScript, Chart.js.
- **Communication**: REST APIs (JSON payloads).

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.9+
- A modern web browser.

### 1. Virtual Environment Setup
It is highly recommended to use a virtual environment to isolate the project dependencies.
```bash
# Navigate to the project root
cd ChilliFusionNet/chillifusionnet_app

# Create a virtual environment
python -m venv venv

# Activate the virtual environment (Windows)
venv\Scripts\activate

# Activate the virtual environment (macOS/Linux)
source venv/bin/activate
```

### 2. Dependencies
Install the required backend libraries:
```bash
cd backend
pip install -r requirements.txt
```
*(Key dependencies include: `fastapi`, `uvicorn`, `tensorflow`, `opencv-python-headless`, `pydantic`)*

### 3. Backend Startup
Start the FastAPI server. This must be running for the frontend to perform diagnoses and fetch dashboard metrics.
```bash
# From the backend directory
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API will be available at `http://localhost:8000`.

### 4. Frontend Startup
The frontend consists of static HTML/CSS/JS files and can be served using Python's built-in HTTP server.
Open a new terminal window:
```bash
cd frontend
python -m http.server 3000
```
Navigate to `http://localhost:3000` in your web browser.

---

## 🔌 API Overview

The backend exposes several key RESTful endpoints:
- `POST /api/diagnose`: Accepts an image upload and returns the predicted class, confidence probabilities, and base64-encoded XAI images (Grad-CAM, Heatmap, Overlay).
- `GET /api/dashboard`: Returns high-level metrics for the main dashboard (e.g., accuracy, dataset sizes).
- `GET /api/reports`: Returns detailed training history, classification reports, and static image paths for the research results page.
- `GET /health`: A backward-compatible endpoint to check if the model is loaded and the server is healthy.

---

## 🧠 Supported Classes

The system currently detects 5 distinct conditions with near-perfect precision and recall:
1. **Cercospora Leaf Spot**
2. **Healthy**
3. **Mites & Thrips Infestation**
4. **Nutritional Deficiency**
5. **Powdery Mildew**

---

## 🛠️ Troubleshooting

- **CORS Errors / API not responding**: Ensure the backend server is running on `http://localhost:8000`. If you changed the port, update the API URLs in `frontend/js/api.js`.
- **Model Not Found**: Ensure `chillifusionnet_final.keras` is placed in the `project_data/model/` directory, or update `backend/config/settings.py` to point to the correct model path.
- **Port 8000/3000 already in use**: You can change the backend port using `--port <NEW_PORT>` and the frontend port by running `python -m http.server <NEW_PORT>`.
- **Images not loading in Dashboard**: Ensure the backend is running, as the showcase images (ROC, Grad-CAM examples) are served statically via the FastAPI `app.mount("/static/showcase", ...)`.

---

## 📝 Authors
- Developed as a Final Year Project Demonstration.