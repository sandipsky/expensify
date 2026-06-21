"""Production settings (PythonAnywhere / Fly.io)."""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# DJANGO_ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS must be set in the environment.
ALLOWED_HOSTS = env('DJANGO_ALLOWED_HOSTS')

# Trust the proxy's X-Forwarded-Proto header (Fly.io terminates TLS upstream).
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS', default=[])

# Security hardening — toggle off only if serving plain HTTP intentionally.
SECURE_SSL_REDIRECT = env.bool('DJANGO_SECURE_SSL_REDIRECT', default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int('DJANGO_HSTS_SECONDS', default=2592000)  # 30 days
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
