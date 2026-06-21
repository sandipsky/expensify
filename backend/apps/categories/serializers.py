from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'type', 'icon', 'created_at')
        read_only_fields = ('id', 'created_at')

    def update(self, instance: Category, validated_data: dict) -> Category:
        # Type is immutable once set (changing it would break historical reports).
        new_type = validated_data.get('type')
        if new_type is not None and new_type != instance.type:
            raise serializers.ValidationError({'type': 'Category type cannot be changed.'})
        validated_data.pop('type', None)
        return super().update(instance, validated_data)

    def validate(self, attrs: dict) -> dict:
        owner = self.context['request'].user
        name = attrs.get('name', getattr(self.instance, 'name', None))
        ctype = attrs.get('type', getattr(self.instance, 'type', None))
        qs = Category.objects.filter(owner=owner, type=ctype, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {'name': f'A {ctype} category named "{name}" already exists.'}
            )
        return attrs
