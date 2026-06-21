from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.viewsets import OwnedModelViewSet

from .models import Account
from .serializers import AccountSerializer


class AccountViewSet(OwnedModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    search_fields = ('name',)
    ordering_fields = ('name', 'created_at')

    def perform_destroy(self, instance: Account) -> None:
        # Deletable only if it has no transactions and no budgets (PROJECT.md 3.3).
        if instance.is_in_use:
            raise ValidationError(
                'Account has transactions or budgets attached and cannot be deleted.'
            )
        instance.delete()

    @action(detail=True, methods=['get'])
    def balance(self, request: Request, pk: str | None = None) -> Response:
        """GET /accounts/{id}/balance -> current derived balance."""
        account = self.get_object()
        return Response({'account_id': account.id, 'balance': account.balance})
