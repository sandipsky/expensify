from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('kind', 'amount', 'account', 'category', 'date', 'owner')
    list_filter = ('kind', 'date')
    search_fields = ('notes',)
    autocomplete_fields = ()
