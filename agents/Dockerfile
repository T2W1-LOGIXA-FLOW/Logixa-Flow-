FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY agents/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/ .

CMD ["python", "main_pipeline.py"]
