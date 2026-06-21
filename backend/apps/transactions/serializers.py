from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Account
from apps.categories.models import Category

from .models import Transaction


class AttachmentSerializer(serializers.Serializer):
    """Read-only nested representation of a transaction's attachment."""

    name = serializers.CharField(source='attachment_name')
    mime_type = serializers.CharField(source='attachment_mime')
    size = serializers.IntegerField(source='attachment_size')
    url = serializers.SerializerMethodField()

    def get_url(self, obj: Transaction) -> str | None:
        if not obj.attachment:
            return None
        request = self.context.get('request')
        url = obj.attachment.url
        return request.build_absolute_uri(url) if request else url


class TransactionSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    to_account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(), allow_null=True, required=False
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), allow_null=True, required=False
    )
    attachment = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id', 'kind', 'amount', 'account', 'to_account', 'category',
            'date', 'notes', 'attachment', 'created_at',
        )
        read_only_fields = ('id', 'created_at', 'attachment')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Scope FK choices to the requesting user's own records.
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            owned = {'owner': request.user}
            self.fields['account'].queryset = Account.objects.filter(**owned)
            self.fields['to_account'].queryset = Account.objects.filter(**owned)
            self.fields['category'].queryset = Category.objects.filter(**owned)

    def get_attachment(self, obj: Transaction):
        if not obj.attachment:
            return None
        return AttachmentSerializer(obj, context=self.context).data

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_date(self, value):
        cap = (timezone.now() + timedelta(days=365)).date()
        if value > cap:
            raise serializers.ValidationError('Date is too far in the future.')
        return value

    def validate(self, attrs: dict) -> dict:
        kind = attrs.get('kind', getattr(self.instance, 'kind', None))
        account = attrs.get('account', getattr(self.instance, 'account', None))
        to_account = attrs.get('to_account', getattr(self.instance, 'to_account', None))
        category = attrs.get('category', getattr(self.instance, 'category', None))

        if kind == Transaction.Kind.TRANSFER:
            if to_account is None:
                raise serializers.ValidationError(
                    {'to_account': 'A transfer requires a destination account.'}
                )
            if to_account == account:
                raise serializers.ValidationError(
                    {'to_account': 'Transfer accounts must be different.'}
                )
            # Transfers carry no category.
            attrs['category'] = None
        else:
            attrs['to_account'] = None
            if category is None:
                raise serializers.ValidationError(
                    {'category': f'A {kind} requires a category.'}
                )
            if category.type != kind:
                raise serializers.ValidationError(
                    {'category': f'Category type must be "{kind}".'}
                )

        return attrs
