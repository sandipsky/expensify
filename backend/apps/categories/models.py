from django.db import models

from apps.common.models import OwnedModel


class Category(OwnedModel):
    class Type(models.TextChoices):
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'

    name = models.CharField(max_length=60)
    # ``type`` is fixed at creation (PROJECT.md 3.2) — enforced in the serializer.
    type = models.CharField(max_length=10, choices=Type.choices)
    icon = models.CharField(max_length=60)

    class Meta(OwnedModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=('owner', 'type', 'name'),
                name='uniq_category_owner_type_name',
            )
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.type})'
