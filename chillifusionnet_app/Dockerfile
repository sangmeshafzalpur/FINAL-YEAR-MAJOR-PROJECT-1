FROM python:3.11-slim

RUN useradd -m -u 1000 user

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PORT=7860 \
    MPLCONFIGDIR=/tmp/matplotlib \
    TF_CPP_MIN_LOG_LEVEL=2

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

COPY . /app

RUN mkdir -p /app/backend/outputs/reports \
             /app/backend/outputs/gradcam \
             /app/backend/outputs/heatmaps \
             /app/backend/uploads \
             /tmp/matplotlib && \
    chown -R user:user /app /tmp/matplotlib

USER user

EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
