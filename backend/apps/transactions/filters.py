import django_filters as filters

from .models import Transaction


class TransactionFilter(filters.FilterSet):
    """Query filters for GET /transactions (PROJECT.md 6)."""

    kind = filters.ChoiceFilter(choices=Transaction.Kind.choices)
    category = filters.UUIDFilter(field_name='category_id')
    account = filters.UUIDFilter(method='filter_account')
    from_date = filters.DateFilter(field_name='date', lookup_expr='gte')
    to_date = filters.DateFilter(field_name='date', lookup_expr='lte')
    q = filters.CharFilter(field_name='notes', lookup_expr='icontains')

    class Meta:
        model = Transaction
        fields = ('kind', 'category', 'account', 'from_date', 'to_date', 'q')

    def __init__(self, data=None, *args, **kwargs):
        # Accept the spec's short ``from`` / ``to`` query keys as aliases.
        if data is not None:
            data = data.copy()
            if 'from' in data:
                data.setdefault('from_date', data['from'])
            if 'to' in data:
                data.setdefault('to_date', data['to'])
        super().__init__(data, *args, **kwargs)

    def filter_account(self, queryset, name, value):
        # Match the account as either source or transfer destination.
        from django.db.models import Q

        return queryset.filter(Q(account_id=value) | Q(to_account_id=value))
