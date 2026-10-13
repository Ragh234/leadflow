FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY seed.py .

RUN useradd --create-home --uid 10001 leadflow
USER leadflow

EXPOSE 8000

# Seed demo data on the first boot only, then serve the API.
CMD ["sh", "-c", "python seed.py --if-empty && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
