"""Development settings."""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True

ALLOWED_HOSTS = env('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '*'])

# Convenient during local dev: allow any localhost port the Vite dev server uses.
CORS_ALLOWED_ORIGIN_REGEXES = [r'^http://localhost:\d+$', r'^http://127\.0\.0\.1:\d+$']
