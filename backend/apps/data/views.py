"""Full data export / import (PROJECT.md 3.7)."""

import csv
import io
import json
import zipfile
from datetime import date, datetime
from decimal import Decimal

from django.db import transaction as db_transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Account
from apps.budgets.models import Budget
from apps.categories.models import Category
from apps.transactions.models import Transaction

from .serializers import (
    ExportAccountSerializer,
    ExportBudgetSerializer,
    ExportCategorySerializer,
    ExportTransactionSerializer,
)

EXPORT_VERSION = 1


def _build_backup(user) -> dict:
    return {
        'version': EXPORT_VERSION,
        'exported_at': datetime.utcnow().isoformat() + 'Z',
        'accounts': ExportAccountSerializer(
            Account.objects.filter(owner=user), many=True
        ).data,
        'categories': ExportCategorySerializer(
            Category.objects.filter(owner=user), many=True
        ).data,
        'budgets': ExportBudgetSerializer(
            Budget.objects.filter(owner=user), many=True
        ).data,
        'transactions': ExportTransactionSerializer(
            Transaction.objects.filter(owner=user), many=True
        ).data,
    }


def _json_default(value):
    if isinstance(value, (Decimal,)):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


class ExportView(APIView):
    """GET /export?format=json|csv."""

    def get(self, request: Request) -> HttpResponse:
        fmt = request.query_params.get('format', 'json').lower()
        backup = _build_backup(request.user)

        if fmt == 'csv':
            return self._csv_zip(backup)

        body = json.dumps(backup, default=_json_default, indent=2)
        response = HttpResponse(body, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="expensify-export.json"'
        return response

    @staticmethod
    def _csv_zip(backup: dict) -> HttpResponse:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            for entity in ('accounts', 'categories', 'budgets', 'transactions'):
                rows = backup[entity]
                text = io.StringIO()
                if rows:
                    writer = csv.DictWriter(text, fieldnames=list(rows[0].keys()))
                    writer.writeheader()
                    writer.writerows(rows)
                archive.writestr(f'{entity}.csv', text.getvalue())
        response = HttpResponse(buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="expensify-export.zip"'
        return response


class ImportView(APIView):
    """POST /import — accepts the JSON backup shape with a conflict policy.

    Body: a JSON object (or multipart 'file' upload) matching the export format,
    plus an optional ``policy`` of ``skip`` | ``overwrite`` | ``rename``.
    Returns per-entity counts and row-level errors.
    """

    def post(self, request: Request) -> Response:
        payload, policy = self._read_payload(request)
        if payload is None:
            return Response(
                {'detail': 'No import data provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        errors: list[dict] = []
        counts = {'accounts': 0, 'categories': 0, 'budgets': 0, 'transactions': 0}
        account_map: dict[str, Account] = {}
        category_map: dict[str, Category] = {}

        with db_transaction.atomic():
            self._import_accounts(payload.get('accounts', []), user, policy, account_map, counts, errors)
            self._import_categories(payload.get('categories', []), user, policy, category_map, counts, errors)
            self._import_budgets(payload.get('budgets', []), user, account_map, category_map, counts, errors)
            self._import_transactions(payload.get('transactions', []), user, account_map, category_map, counts, errors)

        return Response({'imported': counts, 'errors': errors})

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def _read_payload(request: Request):
        policy = 'skip'
        if 'file' in request.FILES:
            try:
                payload = json.loads(request.FILES['file'].read().decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                return None, policy
            policy = request.data.get('policy', policy)
            return payload, policy

        data = request.data
        if not isinstance(data, dict):
            return None, policy
        policy = data.get('policy', policy)
        payload = data.get('data', data)
        return payload, policy

    @staticmethod
    def _unique_name(model, owner, name: str, **extra) -> str:
        candidate, suffix = name, 1
        while model.objects.filter(owner=owner, name=candidate, **extra).exists():
            suffix += 1
            candidate = f'{name} ({suffix})'
        return candidate

    def _import_accounts(self, rows, user, policy, account_map, counts, errors) -> None:
        for index, row in enumerate(rows):
            try:
                name = (row.get('name') or '').strip()
                existing = Account.objects.filter(owner=user, name=name).first()
                if existing and policy == 'skip':
                    account_map[str(row.get('id'))] = existing
                    continue
                if existing and policy == 'overwrite':
                    existing.initial_amount = row.get('initial_amount', existing.initial_amount)
                    existing.notes = row.get('notes', '') or ''
                    existing.save()
                    account_map[str(row.get('id'))] = existing
                    counts['accounts'] += 1
                    continue
                if existing and policy == 'rename':
                    name = self._unique_name(Account, user, name)
                acc = Account.objects.create(
                    owner=user,
                    name=name,
                    initial_amount=row.get('initial_amount', 0),
                    notes=row.get('notes', '') or '',
                )
                account_map[str(row.get('id'))] = acc
                counts['accounts'] += 1
            except Exception as exc:  # noqa: BLE001 - report, don't abort the row loop
                errors.append({'entity': 'accounts', 'row': index, 'message': str(exc)})

    def _import_categories(self, rows, user, policy, category_map, counts, errors) -> None:
        for index, row in enumerate(rows):
            try:
                name = (row.get('name') or '').strip()
                ctype = row.get('type')
                existing = Category.objects.filter(owner=user, type=ctype, name=name).first()
                if existing and policy == 'skip':
                    category_map[str(row.get('id'))] = existing
                    continue
                if existing and policy == 'overwrite':
                    existing.icon = row.get('icon', existing.icon)
                    existing.save()
                    category_map[str(row.get('id'))] = existing
                    counts['categories'] += 1
                    continue
                if existing and policy == 'rename':
                    name = self._unique_name(Category, user, name, type=ctype)
                cat = Category.objects.create(
                    owner=user, name=name, type=ctype, icon=row.get('icon', ''),
                )
                category_map[str(row.get('id'))] = cat
                counts['categories'] += 1
            except Exception as exc:  # noqa: BLE001
                errors.append({'entity': 'categories', 'row': index, 'message': str(exc)})

    def _import_budgets(self, rows, user, account_map, category_map, counts, errors) -> None:
        for index, row in enumerate(rows):
            try:
                account = account_map.get(str(row.get('account')))
                category = category_map.get(str(row.get('category')))
                if account is None or category is None:
                    raise ValueError('References an account or category not present in the import.')
                Budget.objects.create(
                    owner=user,
                    amount=row.get('amount', 0),
                    account=account,
                    category=category,
                    duration=row.get('duration', 'monthly'),
                    start_at=row.get('start_at'),
                    end_at=row.get('end_at'),
                )
                counts['budgets'] += 1
            except Exception as exc:  # noqa: BLE001
                errors.append({'entity': 'budgets', 'row': index, 'message': str(exc)})

    def _import_transactions(self, rows, user, account_map, category_map, counts, errors) -> None:
        for index, row in enumerate(rows):
            try:
                account = account_map.get(str(row.get('account')))
                if account is None:
                    raise ValueError('References an account not present in the import.')
                to_account = account_map.get(str(row.get('to_account'))) if row.get('to_account') else None
                category = category_map.get(str(row.get('category'))) if row.get('category') else None
                Transaction.objects.create(
                    owner=user,
                    kind=row.get('kind'),
                    amount=row.get('amount', 0),
                    account=account,
                    to_account=to_account,
                    category=category,
                    date=row.get('date'),
                    notes=row.get('notes', '') or '',
                )
                counts['transactions'] += 1
            except Exception as exc:  # noqa: BLE001
                errors.append({'entity': 'transactions', 'row': index, 'message': str(exc)})
