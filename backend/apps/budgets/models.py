import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils import timezone

from apps.common.models import OwnedModel


def derive_budget_range(duration: str, reference: date) -> tuple[date, date]:
    """Window for a recurring duration, anchored on ``reference`` (today).

    Mirrors the frontend's ``deriveBudgetRange`` (budgets/utils.ts).
    """
    if duration == Budget.Duration.WEEKLY:
        start = reference - timedelta(days=reference.weekday())  # Monday (ISO week)
        return start, start + timedelta(days=6)
    if duration == Budget.Duration.MONTHLY:
        last = calendar.monthrange(reference.year, reference.month)[1]
        return reference.replace(day=1), reference.replace(day=last)
    if duration == Budget.Duration.QUARTERLY:
        q_start_month = ((reference.month - 1) // 3) * 3 + 1
        q_end_month = q_start_month + 2
        last = calendar.monthrange(reference.year, q_end_month)[1]
        return (
            date(reference.year, q_start_month, 1),
            date(reference.year, q_end_month, last),
        )
    if duration == Budget.Duration.YEARLY:
        return date(reference.year, 1, 1), date(reference.year, 12, 31)
    # custom fallback (not used; custom budgets keep their stored range)
    return reference, reference


class Budget(OwnedModel):
    class Duration(models.TextChoices):
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        YEARLY = 'yearly', 'Yearly'
        CUSTOM = 'custom', 'Custom'

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.ForeignKey(
        'categories.Category', on_delete=models.PROTECT, related_name='budgets'
    )
    account = models.ForeignKey(
        'accounts.Account', on_delete=models.PROTECT, related_name='budgets'
    )
    duration = models.CharField(max_length=10, choices=Duration.choices)
    start_at = models.DateField()
    end_at = models.DateField()

    def window(self, reference: date | None = None) -> tuple[date, date]:
        """Measurement window: custom budgets use their stored range; recurring
        ones advance to the current period (mirrors getBudgetWindow)."""
        reference = reference or timezone.now().date()
        if self.duration == self.Duration.CUSTOM:
            return self.start_at, self.end_at
        return derive_budget_range(self.duration, reference)

    def usage(self, reference: date | None = None) -> dict:
        from apps.transactions.models import Transaction

        start, end = self.window(reference)
        used = (
            Transaction.objects.filter(
                owner_id=self.owner_id,
                kind=Transaction.Kind.EXPENSE,
                category_id=self.category_id,
                account_id=self.account_id,
                date__gte=start,
                date__lte=end,
            ).aggregate(s=Sum('amount'))['s']
            or Decimal('0')
        )
        remaining = self.amount - used
        percent = (used / self.amount * 100) if self.amount > 0 else Decimal('0')
        return {
            'budget_id': self.id,
            'amount': self.amount,
            'used': used,
            'remaining': remaining,
            'percent': round(float(percent), 1),
            'start_at': start,
            'end_at': end,
        }

    def __str__(self) -> str:
        return f'Budget {self.amount} ({self.duration})'
