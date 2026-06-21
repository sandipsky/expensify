from django.contrib import admin

from .models import Budget


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('amount', 'category', 'account', 'duration', 'start_at', 'end_at', 'owner')
    list_filter = ('duration',)
