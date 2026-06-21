from django.contrib import admin

from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'icon', 'owner', 'created_at')
    list_filter = ('type',)
    search_fields = ('name',)
