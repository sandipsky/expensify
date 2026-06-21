"""Shared permissions."""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Object-level guard: the requesting user must own the record."""

    def has_object_permission(self, request, view, obj) -> bool:
        owner_id = getattr(obj, 'owner_id', None)
        return owner_id is not None and owner_id == request.user.id
