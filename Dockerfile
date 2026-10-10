FROM python:3.12-slim

# Install system dependencies (ffmpeg is required for twibbon video compositing)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Ensure temp directory exists
RUN mkdir -p temp

# Expose port and configure production WSGI runner
ENV PORT=5000
EXPOSE 5000

# Gunicorn with threads and extended timeout for FFmpeg rendering
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180 app:app
