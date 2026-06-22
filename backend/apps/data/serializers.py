"""Plain serializers used to shape the export backup (no envelope/derived fields)."""

from rest_framework import serializers

from apps.accounts.models import Account
from apps.budgets.models import Budget
from apps.categories.models import Category
from apps.transactions.models import Transaction


class ExportAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ('id', 'name', 'initial_amount', 'notes', 'created_at')


class ExportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'type', 'icon', 'created_at')


class ExportBudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = (
            'id', 'amount', 'category', 'account', 'duration',
            'start_at', 'end_at', 'created_at',
        )


class ExportTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = (
            'id', 'kind', 'amount', 'account', 'to_account', 'category',
            'date', 'notes', 'created_at',
        )
