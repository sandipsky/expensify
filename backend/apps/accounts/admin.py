from django.contrib import admin

from .models import Account


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'initial_amount', 'owner', 'created_at')
    search_fields = ('name',)
