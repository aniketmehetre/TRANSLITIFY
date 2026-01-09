# 1. Use a lightweight Python base image
FROM python:3.9-slim

# 2. Install Tesseract and Language Packs (Hindi, Marathi, etc.)
# We update the system and install the software
RUN apt-get update && \
    apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-mar \
    tesseract-ocr-tam \
    tesseract-ocr-guj \
    tesseract-ocr-fra \
    tesseract-ocr-spa \
    tesseract-ocr-deu \
    && apt-get clean

# 3. Set the working directory
WORKDIR /app

# 4. Copy the project files into the container
COPY . /app

# 5. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 6. Create upload/static directories to avoid permission errors
RUN mkdir -p uploads static

# 7. Command to run the app using Gunicorn (Production Server)
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "app:app"]
