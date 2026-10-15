FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/web-platform/backend/agents/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/web-platform/backend/agents/ .

CMD ["python", "worker_loop.py"]
