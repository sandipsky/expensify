"""Seed the database with the two baseline users.

Creates only:
    - ``admin`` / ``admin`` (role: admin)
    - ``demo``  / ``demo``  (role: user)

No categories, accounts, transactions, or budgets are seeded.

    python manage.py seed_demo            # create/ensure the baseline users
    python manage.py seed_demo --reset    # also reset their passwords
"""

from django.core.management.base import BaseCommand

from apps.users.models import User

SEED_USERS = (
    {'username': 'admin', 'password': 'admin', 'name': 'Administrator', 'role': User.Role.ADMIN},
    {'username': 'demo', 'password': 'demo', 'name': 'Demo User', 'role': User.Role.USER},
)


class Command(BaseCommand):
    help = 'Seed the baseline admin and demo users (no other data).'

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset the password of existing seeded users.',
        )

    def handle(self, *args, **options) -> None:
        reset = options['reset']
        for row in SEED_USERS:
            is_admin = row['role'] == User.Role.ADMIN
            user, created = User.objects.get_or_create(
                username=row['username'],
                defaults={'name': row['name'], 'role': row['role']},
            )
            if created or reset:
                user.name = row['name']
                user.role = row['role']
                user.is_staff = is_admin
                user.is_superuser = is_admin
                user.set_password(row['password'])
                user.save()
                verb = 'created' if created else 'reset'
                self.stdout.write(f'  {verb}: {user.username} (password: {row["password"]})')
            else:
                self.stdout.write(f'  exists: {user.username} (unchanged)')

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
