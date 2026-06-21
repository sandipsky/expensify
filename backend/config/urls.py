"""Root URL configuration. All API routes live under ``/api/v1/``."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import AccountViewSet
from apps.budgets.views import BudgetViewSet
from apps.categories.views import CategoryViewSet
from apps.dashboard.calendar_views import CalendarView
from apps.dashboard.views import DashboardSummaryView
from apps.data.views import ExportView, ImportView
from apps.transactions.views import TransactionViewSet
from apps.users.views import LoginView, UserViewSet

router = DefaultRouter(trailing_slash=False)
router.register('users', UserViewSet, basename='user')
router.register('categories', CategoryViewSet, basename='category')
router.register('accounts', AccountViewSet, basename='account')
router.register('budgets', BudgetViewSet, basename='budget')
router.register('transactions', TransactionViewSet, basename='transaction')

api_v1 = [
    path('auth/login', LoginView.as_view(), name='login'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('dashboard/summary', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('calendar', CalendarView.as_view(), name='calendar'),
    path('export', ExportView.as_view(), name='export'),
    path('import', ImportView.as_view(), name='import'),
    path('', include(router.urls)),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include((api_v1, 'api'), namespace='v1')),
    # Serve uploaded attachments. WhiteNoise handles static assets; media lives
    # on the persistent volume, so we serve it through Django at this scale.
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
