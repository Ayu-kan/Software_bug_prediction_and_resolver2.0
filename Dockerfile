# ==============================================================================
# Stage 1: Build the React + TypeScript Frontend with Vite
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci || npm install

# Copy frontend source code and compile production build
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Python Backend & All-in-One Runner
# ==============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app:/app/src" \
    PORT=8000

# Install required system dependencies (Git, build tools, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and source directories
COPY backend/ ./backend/
COPY src/ ./src/
COPY models/ ./models/
COPY data/ ./data/
COPY repos/ ./repos/

# Copy compiled frontend assets from Stage 1 into backend for unified serving
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose backend API and SPA port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the FastAPI application with Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
