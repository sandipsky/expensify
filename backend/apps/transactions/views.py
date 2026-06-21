from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.viewsets import OwnedModelViewSet

from .filters import TransactionFilter
from .models import Transaction
from .serializers import AttachmentSerializer, TransactionSerializer


class TransactionViewSet(OwnedModelViewSet):
    queryset = Transaction.objects.select_related('account', 'to_account', 'category')
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    ordering_fields = ('date', 'amount', 'created_at')
    ordering = ('-date', '-created_at')
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    @action(
        detail=True,
        methods=['post', 'delete'],
        parser_classes=(MultiPartParser, FormParser),
    )
    def attachment(self, request: Request, pk: str | None = None) -> Response:
        """POST  /transactions/{id}/attachment  -> upload (multipart 'file').
        DELETE /transactions/{id}/attachment  -> remove.
        """
        txn = self.get_object()

        if request.method == 'DELETE':
            if txn.attachment:
                txn.attachment.delete(save=False)
            txn.attachment = None
            txn.attachment_name = ''
            txn.attachment_mime = ''
            txn.attachment_size = None
            txn.save()
            return Response(status=status.HTTP_204_NO_CONTENT)

        upload = request.FILES.get('file')
        if upload is None:
            raise ValidationError({'file': 'No file provided.'})
        if upload.size > settings.MAX_ATTACHMENT_SIZE:
            raise ValidationError({'file': 'File exceeds the maximum allowed size.'})
        if upload.content_type not in settings.ALLOWED_ATTACHMENT_TYPES:
            raise ValidationError({'file': f'Unsupported file type: {upload.content_type}.'})

        if txn.attachment:
            txn.attachment.delete(save=False)
        txn.attachment = upload
        txn.attachment_name = upload.name
        txn.attachment_mime = upload.content_type
        txn.attachment_size = upload.size
        txn.save()

        return Response(AttachmentSerializer(txn, context=self.get_serializer_context()).data)
