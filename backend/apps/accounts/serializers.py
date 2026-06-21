from rest_framework import serializers

from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    # Derived, read-only current balance.
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Account
        fields = ('id', 'name', 'initial_amount', 'notes', 'balance', 'created_at')
        read_only_fields = ('id', 'created_at', 'balance')

    def validate_name(self, value: str) -> str:
        name = value.strip()
        owner = self.context['request'].user
        qs = Account.objects.filter(owner=owner, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f'An account named "{name}" already exists.')
        return name
