import calendar as cal
from datetime import date
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.transactions.models import Transaction


class CalendarView(APIView):
    """GET /calendar?month=YYYY-MM -> per-day net summary for the month."""

    def get(self, request: Request) -> Response:
        month_param = request.query_params.get('month')
        if month_param:
            try:
                year, month = (int(part) for part in month_param.split('-'))
                first = date(year, month, 1)
            except (ValueError, TypeError):
                raise ValidationError({'month': 'Expected format YYYY-MM.'})
        else:
            first = timezone.now().date().replace(day=1)

        last = first.replace(day=cal.monthrange(first.year, first.month)[1])

        rows = (
            Transaction.objects.filter(owner=request.user, date__gte=first, date__lte=last)
            .values('date', 'kind')
            .annotate(total=Sum('amount'), count=Count('id'))
        )

        days: dict[str, dict] = {}
        for row in rows:
            key = row['date'].isoformat()
            bucket = days.setdefault(
                key,
                {'date': key, 'count': 0, 'income': Decimal('0'), 'expense': Decimal('0')},
            )
            bucket['count'] += row['count']
            if row['kind'] == Transaction.Kind.INCOME:
                bucket['income'] += row['total']
            elif row['kind'] == Transaction.Kind.EXPENSE:
                bucket['expense'] += row['total']
            # Transfers count toward the day's activity but not its net.

        for bucket in days.values():
            bucket['net'] = bucket['income'] - bucket['expense']

        return Response(
            {
                'month': f'{first.year:04d}-{first.month:02d}',
                'days': [days[k] for k in sorted(days)],
            }
        )
