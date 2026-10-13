FROM python:3.11-slim

# Create a non-root user (Hugging Face standard UID 1000)
RUN useradd -m -u 1000 user

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PORT=7860 \
    MPLCONFIGDIR=/tmp/matplotlib \
    TF_CPP_MIN_LOG_LEVEL=2

# Install Linux system dependencies for OpenCV and image operations
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy all project code
COPY . /app

# Ensure output directories exist and are writable by non-root user
RUN mkdir -p /app/chillifusionnet_app/backend/outputs/reports \
             /app/chillifusionnet_app/backend/outputs/gradcam \
             /app/chillifusionnet_app/backend/outputs/heatmaps \
             /app/chillifusionnet_app/backend/uploads \
             /tmp/matplotlib && \
    chown -R user:user /app /tmp/matplotlib

USER user

WORKDIR /app/chillifusionnet_app

EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
