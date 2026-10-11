# Stage 1: Build Frontend React Vite
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Python Backend with FFmpeg
FROM python:3.12-slim

# Install system dependencies (ffmpeg is required for twibbon video compositing)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set up non-root user
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install python dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application source code
COPY --chown=user . .

# Copy compiled frontend dist from frontend-builder stage
COPY --chown=user --from=frontend-builder /app/dist ./dist

# Ensure temp directory exists
RUN mkdir -p temp

# Default port (will be overridden by $PORT on cloud platforms like Render / Railway)
ENV PORT=5000
EXPOSE 5000

# Run with Gunicorn WSGI server
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180 app:app
