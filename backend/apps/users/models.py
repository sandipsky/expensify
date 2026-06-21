"""Custom user model.

Extends Django's ``AbstractUser`` with a UUID primary key, a display ``name``,
and a ``role`` (``admin`` / ``user``). The username remains the login handle.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        USER = 'user', 'User'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    created_at = models.DateTimeField(auto_now_add=True)

    # ``first_name`` / ``last_name`` are unused; ``name`` is the display field.
    first_name = None
    last_name = None

    class Meta:
        ordering = ('-created_at',)

    def save(self, *args, **kwargs) -> None:
        # Usernames are case-insensitive handles; normalise to lower-case.
        if self.username:
            self.username = self.username.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.username
