from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.viewsets import OwnedModelViewSet

from .models import Budget
from .serializers import BudgetSerializer


class BudgetViewSet(OwnedModelViewSet):
    queryset = Budget.objects.select_related('account', 'category')
    serializer_class = BudgetSerializer
    filterset_fields = ('duration', 'category', 'account')
    ordering_fields = ('amount', 'created_at')

    @action(detail=True, methods=['get'])
    def progress(self, request: Request, pk: str | None = None) -> Response:
        """GET /budgets/{id}/progress -> used / remaining / percent for the
        current window."""
        budget = self.get_object()
        return Response(budget.usage())
