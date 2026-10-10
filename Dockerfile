FROM python:3.12-slim

# Install system dependencies (ffmpeg is required for twibbon video compositing)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set up non-root user (required for Hugging Face Spaces compatibility)
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

# Ensure temp directory exists
RUN mkdir -p temp

# Expose port (7860 for Hugging Face Spaces, dynamically overridden by $PORT on other hosts)
ENV PORT=7860
EXPOSE 7860

# Run with Gunicorn WSGI server
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180 app:app
