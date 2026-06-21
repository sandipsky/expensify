from rest_framework import serializers

from apps.accounts.models import Account
from apps.categories.models import Category

from .models import Budget, derive_budget_range
from django.utils import timezone


class BudgetSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    # start_at / end_at are required only for custom durations.
    start_at = serializers.DateField(required=False)
    end_at = serializers.DateField(required=False)

    class Meta:
        model = Budget
        fields = (
            'id', 'amount', 'category', 'account', 'duration',
            'start_at', 'end_at', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            self.fields['account'].queryset = Account.objects.filter(owner=request.user)
            self.fields['category'].queryset = Category.objects.filter(owner=request.user)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_category(self, value: Category) -> Category:
        if value.type != Category.Type.EXPENSE:
            raise serializers.ValidationError('Budget category must be an expense category.')
        return value

    def validate(self, attrs: dict) -> dict:
        duration = attrs.get('duration', getattr(self.instance, 'duration', None))
        start = attrs.get('start_at', getattr(self.instance, 'start_at', None))
        end = attrs.get('end_at', getattr(self.instance, 'end_at', None))

        if duration == Budget.Duration.CUSTOM:
            if not start or not end:
                raise serializers.ValidationError(
                    'Custom budgets require both start_at and end_at.'
                )
            if end < start:
                raise serializers.ValidationError({'end_at': 'End must be on or after start.'})
        else:
            # Derive the stored range for recurring durations.
            start, end = derive_budget_range(duration, timezone.now().date())
            attrs['start_at'] = start
            attrs['end_at'] = end

        return attrs
