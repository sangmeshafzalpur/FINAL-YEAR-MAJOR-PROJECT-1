# Deployment Strategy

While the current setup runs locally via Uvicorn and Python's built-in HTTP server, this document outlines the theoretical strategy for deploying the ChilliFusionNet application to a production environment.

## 1. Containerization (Docker)
To ensure consistency across environments, both the frontend and backend should be containerized.

### Backend Container
- **Base Image**: A lightweight Python 3.9+ image (e.g., `python:3.9-slim`).
- **Dependencies**: Install the required `requirements.txt` (FastAPI, TensorFlow, OpenCV). Note: Use `opencv-python-headless` to avoid missing system libraries in the container.
- **Server**: Run the FastAPI app using an ASGI server managed by Gunicorn for production-grade worker management (e.g., `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker`).

### Frontend Container
- **Base Image**: An Nginx alpine image (e.g., `nginx:alpine`).
- **Configuration**: Copy the static `frontend/` files into the Nginx serving directory (`/usr/share/nginx/html`). Configure Nginx to serve these static files and optionally reverse-proxy the API requests to the backend container.

## 2. Orchestration (Docker Compose)
A `docker-compose.yml` file should be used to orchestrate the two containers, linking them on a shared internal network so the frontend can securely communicate with the backend.

## 3. Cloud Hosting
The containerized application can be deployed to various cloud providers:
- **PaaS (Platform as a Service)**: Services like Heroku, Render, or Railway allow for rapid deployment of the Docker containers.
- **IaaS (Infrastructure as a Service)**: Deploying to an AWS EC2 instance, Google Compute Engine, or DigitalOcean Droplet gives full control over the host machine.
- **GPU Acceleration**: Since ChilliFusionNet relies on deep learning inference, deploying the backend to a cloud instance with GPU support (and using the GPU-compiled version of TensorFlow) will drastically reduce inference time for the `/api/diagnose` endpoint.

## 4. Security Considerations
- **HTTPS/SSL**: All external traffic must be encrypted using SSL/TLS. This can be handled by a reverse proxy like Nginx or a cloud load balancer.
- **CORS Configuration**: The FastAPI backend must have its CORS middleware explicitly configured to only allow requests from the specific production domain hosting the frontend.
- **File Upload Limits**: The backend currently handles image uploads. In production, strict file size limits and MIME-type validation must be enforced at both the proxy (Nginx) and application (FastAPI) levels to prevent abuse.
