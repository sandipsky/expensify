"""Abstract base models shared across feature apps."""

import uuid

from django.db import models


class UUIDModel(models.Model):
    """Primary key as a UUID string (stable, non-guessable, client-friendly)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(UUIDModel):
    """UUID PK plus a server-managed ``created_at`` timestamp."""

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ('-created_at',)


class OwnedModel(TimeStampedModel):
    """A record owned by a single user; every feature entity is owner-scoped."""

    owner = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='%(class)ss',
    )

    class Meta:
        abstract = True
        ordering = ('-created_at',)
