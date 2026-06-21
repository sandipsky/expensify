# Expensify backend — Fly.io / container image.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod \
    DJANGO_DATA_DIR=/data \
    DJANGO_DB_PATH=/data/db.sqlite3 \
    PORT=8080

WORKDIR /app

# System deps for Pillow (image attachments).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# /data is a mounted volume in production; create it for build-time commands.
RUN mkdir -p /data
RUN python manage.py collectstatic --noinput || true

EXPOSE 8080

# Migrate, then serve. Static is collected at build; migrations run per-boot.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 3 --timeout 60"]
