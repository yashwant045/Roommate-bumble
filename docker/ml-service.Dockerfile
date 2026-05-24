FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for compiling numpy/scipy/scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ml-service/requirements.txt ./

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice code
COPY ml-service/ ./

EXPOSE 8000

CMD ["python", "main.py"]
