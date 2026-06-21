import calendar
from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Account
from apps.budgets.models import Budget
from apps.transactions.models import Transaction
from apps.transactions.serializers import TransactionSerializer


def _parse_date(value: str | None, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return date.fromisoformat(value)
    except ValueError:
        return fallback


class DashboardSummaryView(APIView):
    """GET /dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD."""

    def get(self, request: Request) -> Response:
        user = request.user
        today = timezone.now().date()
        month_start = today.replace(day=1)
        month_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])

        start = _parse_date(request.query_params.get('from'), month_start)
        end = _parse_date(request.query_params.get('to'), month_end)

        txns = Transaction.objects.filter(owner=user)
        period = txns.filter(date__gte=start, date__lte=end)

        def summed(qs) -> Decimal:
            return qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')

        total_income = summed(period.filter(kind=Transaction.Kind.INCOME))
        total_expense = summed(period.filter(kind=Transaction.Kind.EXPENSE))

        # Total balance across all accounts (all-time, point-in-time).
        total_balance = sum(
            (acc.balance for acc in Account.objects.filter(owner=user)),
            Decimal('0'),
        )

        # Spending by category (expenses within the period).
        spending_rows = (
            period.filter(kind=Transaction.Kind.EXPENSE)
            .values('category_id', 'category__name', 'category__icon')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )
        spending_by_category = [
            {
                'category_id': row['category_id'],
                'name': row['category__name'],
                'icon': row['category__icon'],
                'total': row['total'],
            }
            for row in spending_rows
        ]

        # Income vs. expense trend, bucketed by day within the period.
        trend: dict[str, dict[str, Decimal]] = {}
        for row in (
            period.exclude(kind=Transaction.Kind.TRANSFER)
            .values('date', 'kind')
            .annotate(total=Sum('amount'))
        ):
            key = row['date'].isoformat()
            bucket = trend.setdefault(key, {'income': Decimal('0'), 'expense': Decimal('0')})
            bucket[row['kind']] = row['total']
        income_expense_trend = [
            {'date': key, 'income': v['income'], 'expense': v['expense']}
            for key, v in sorted(trend.items())
        ]

        recent = txns.order_by('-date', '-created_at')[:10]
        recent_transactions = TransactionSerializer(
            recent, many=True, context={'request': request}
        ).data

        budget_progress = [b.usage() for b in Budget.objects.filter(owner=user)]

        return Response(
            {
                'total_balance': total_balance,
                'period': {
                    'from': start.isoformat(),
                    'to': end.isoformat(),
                    'total_income': total_income,
                    'total_expense': total_expense,
                    'net': total_income - total_expense,
                },
                'spending_by_category': spending_by_category,
                'income_expense_trend': income_expense_trend,
                'recent_transactions': recent_transactions,
                'budget_progress': budget_progress,
            }
        )
