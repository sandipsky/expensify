"""Custom DRF exception handling.

The default handler already returns a sensible ``detail`` payload for known API
exceptions; the envelope renderer then wraps it. This thin wrapper additionally
maps Django's ``ProtectedError`` (raised when deleting a referenced row) to a
clean 409 Conflict instead of an unhandled 500.
"""

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def envelope_exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response(
            {'detail': 'This record is referenced by other data and cannot be deleted.'},
            status=status.HTTP_409_CONFLICT,
        )

    return exception_handler(exc, context)
