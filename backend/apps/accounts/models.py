from decimal import Decimal

from django.db import models
from django.db.models import Q, Sum

from apps.common.models import OwnedModel


class Account(OwnedModel):
    name = models.CharField(max_length=60)
    initial_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    notes = models.TextField(blank=True, default='')

    class Meta(OwnedModel.Meta):
        constraints = [
            models.UniqueConstraint(fields=('owner', 'name'), name='uniq_account_owner_name')
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def balance(self) -> Decimal:
        """initial_amount + incoming − outgoing (incl. transfers)."""
        from apps.transactions.models import Transaction

        txns = Transaction.objects.filter(owner_id=self.owner_id)

        def total(condition: Q) -> Decimal:
            return txns.filter(condition).aggregate(s=Sum('amount'))['s'] or Decimal('0')

        income = total(Q(account=self, kind=Transaction.Kind.INCOME))
        expense = total(Q(account=self, kind=Transaction.Kind.EXPENSE))
        transfer_out = total(Q(account=self, kind=Transaction.Kind.TRANSFER))
        transfer_in = total(Q(to_account=self, kind=Transaction.Kind.TRANSFER))

        return self.initial_amount + income - expense - transfer_out + transfer_in

    @property
    def is_in_use(self) -> bool:
        from apps.transactions.models import Transaction

        has_txns = Transaction.objects.filter(
            Q(account=self) | Q(to_account=self)
        ).exists()
        has_budgets = self.budgets.exists()
        return has_txns or has_budgets
