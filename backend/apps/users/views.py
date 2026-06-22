"""Auth + user-management views."""

from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    LoginSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    """POST /auth/login -> { token, refresh, user }."""

    serializer_class = LoginSerializer
    permission_classes = (permissions.AllowAny,)


class IsAdminRole(permissions.BasePermission):
    """Only admins may view or manage users (the ``me`` action is exempt)."""

    def has_permission(self, request: Request, view) -> bool:
        return bool(request.user and request.user.role == User.Role.ADMIN)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = (IsAdminRole,)
    filterset_fields = ('username', 'role')
    search_fields = ('username', 'name')

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request: Request) -> Response:
        """GET /users/me -> the currently authenticated user."""
        return Response(UserSerializer(request.user).data)
