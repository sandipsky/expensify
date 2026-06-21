import uuid

from django.db import models

from apps.common.models import OwnedModel


def attachment_path(instance: 'Transaction', filename: str) -> str:
    return f'attachments/{instance.owner_id}/{uuid.uuid4().hex}/{filename}'


class Transaction(OwnedModel):
    class Kind(models.TextChoices):
        EXPENSE = 'expense', 'Expense'
        INCOME = 'income', 'Income'
        TRANSFER = 'transfer', 'Transfer'

    kind = models.CharField(max_length=10, choices=Kind.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    # PROTECT: an account/category in use cannot be deleted out from under a txn.
    account = models.ForeignKey(
        'accounts.Account', on_delete=models.PROTECT, related_name='outgoing_transactions'
    )
    to_account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.PROTECT,
        related_name='incoming_transfers',
        null=True,
        blank=True,
    )
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.PROTECT,
        related_name='transactions',
        null=True,
        blank=True,
    )
    date = models.DateField()
    notes = models.TextField(blank=True, default='')

    attachment = models.FileField(upload_to=attachment_path, null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    attachment_mime = models.CharField(max_length=100, blank=True, default='')
    attachment_size = models.PositiveIntegerField(null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=('owner', 'date')),
            models.Index(fields=('owner', 'kind')),
        ]

    def __str__(self) -> str:
        return f'{self.kind} {self.amount} on {self.date}'
