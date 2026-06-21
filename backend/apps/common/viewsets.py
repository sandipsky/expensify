"""Reusable viewset base for owner-scoped resources."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .permissions import IsOwner


class OwnedModelViewSet(viewsets.ModelViewSet):
    """A ModelViewSet that scopes every query to ``request.user`` and stamps
    the owner on create. Subclasses set ``queryset`` (the unscoped base) and
    ``serializer_class``.
    """

    permission_classes = (IsAuthenticated, IsOwner)

    def get_queryset(self):
        return super().get_queryset().filter(owner=self.request.user)

    def perform_create(self, serializer) -> None:
        serializer.save(owner=self.request.user)
