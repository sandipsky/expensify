from apps.common.viewsets import OwnedModelViewSet

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(OwnedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filterset_fields = ('type',)
    search_fields = ('name',)
    ordering_fields = ('name', 'created_at')
