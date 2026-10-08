# System Architecture

The ChilliFusionNet application employs a decoupled client-server architecture, ensuring a clean separation of concerns between the user interface and the heavy machine learning computation.

## 1. High-Level Workflow

1. **Client Interaction**: The user accesses the web-based frontend (HTML/CSS/JS) and uploads an image of a chilli leaf.
2. **API Request**: The frontend encapsulates the image in a `multipart/form-data` request and transmits it to the backend via a RESTful POST endpoint (`/api/diagnose`).
3. **Backend Processing**: 
   - **FastAPI Routing**: The request is received and validated by the FastAPI router.
   - **Image Preprocessing**: The raw image is decoded, resized to the required 380x380 resolution, and converted into a normalized tensor.
   - **Model Inference**: The tensor is passed through the pre-loaded ChilliFusionNet `.keras` model to obtain class probabilities.
   - **XAI Generation**: Concurrently, the `HeatmapService` intercepts the gradients from the `top_activation` layer to compute the Grad-CAM grayscale map, applies a JET colormap to generate the Heatmap, and superimposes it to create the Overlay.
4. **Response Formulation**: The backend packages the predicted class, confidence scores, and the three base64-encoded XAI images into a JSON response.
5. **Client Rendering**: The frontend JavaScript parses the JSON and dynamically updates the DOM, rendering the charts, statistics, and professional diagnostic cards.

## 2. Technology Stack

### Frontend (Client-Side)
- **HTML5 & CSS3**: Structured markup with a custom Dark Glassmorphism CSS design system.
- **Vanilla JavaScript (ES6+)**: Handles all API communication, asynchronous state management, and DOM manipulation without the overhead of heavy frontend frameworks.
- **Chart.js**: Utilized for rendering interactive, responsive data visualizations (Training curves, Disease distribution).

### Backend (Server-Side)
- **Python (3.9+)**: The core programming language.
- **FastAPI**: A modern, high-performance web framework used to build the RESTful APIs. Selected for its asynchronous capabilities and automatic validation.
- **Uvicorn**: The ASGI server used to run the FastAPI application.
- **TensorFlow & Keras**: Used for loading the `.keras` model and executing deep learning inference.
- **OpenCV & NumPy**: Utilized for rapid image array manipulation, tensor normalization, and colormap application.

## 3. Directory Structure Summary
- `backend/api/`: Contains the router controllers (diagnosis, dashboard, reports).
- `backend/services/`: Contains the core business logic (model loading, inference, heatmap generation).
- `frontend/`: Contains all statically served client assets.
- `project_data/`: A persistent storage directory holding JSON reports used by the analytics dashboard.
