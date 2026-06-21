"""Serializers for users and authentication."""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Public user shape — never exposes the password."""

    class Meta:
        model = User
        fields = ('id', 'username', 'name', 'role', 'created_at')
        read_only_fields = ('id', 'created_at')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)

    class Meta:
        model = User
        fields = ('id', 'username', 'name', 'role', 'password', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_username(self, value: str) -> str:
        normalised = value.strip().lower()
        if User.objects.filter(username=normalised).exists():
            raise serializers.ValidationError(f'Username "{normalised}" is already taken.')
        return normalised

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'name', 'role', 'password', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_username(self, value: str) -> str:
        normalised = value.strip().lower()
        qs = User.objects.filter(username=normalised)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f'Username "{normalised}" is already taken.')
        return normalised

    def update(self, instance: User, validated_data: dict) -> User:
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(TokenObtainPairSerializer):
    """Issues access + refresh tokens and returns the authenticated user."""

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        return {
            'token': data['access'],
            'refresh': data['refresh'],
            'user': UserSerializer(self.user).data,
        }
