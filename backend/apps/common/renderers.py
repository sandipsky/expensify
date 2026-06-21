"""Response envelope rendering.

Every successful, non-paginated response is wrapped as ``IApiResponse<T>``::

    { "data": <payload>, "success": true }

Paginated payloads already carry their own ``{ data, pagination }`` shape and
pass through untouched. Error responses (status >= 400) are wrapped as::

    { "success": false, "message": "<human readable>", "errors": <detail> }
"""

from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        response = renderer_context.get('response')
        status_code = getattr(response, 'status_code', 200)

        # 204 No Content: emit an empty body.
        if status_code == 204:
            return b''

        if self._is_paginated(data):
            payload = data
        elif status_code >= 400:
            payload = {
                'success': False,
                'message': self._error_message(data),
                'errors': data,
            }
        else:
            payload = {'data': data, 'success': True}

        return super().render(payload, accepted_media_type, renderer_context)

    @staticmethod
    def _is_paginated(data) -> bool:
        return isinstance(data, dict) and 'data' in data and 'pagination' in data

    @staticmethod
    def _error_message(data) -> str:
        if isinstance(data, dict):
            detail = data.get('detail')
            if detail is not None:
                return str(detail)
            for key, value in data.items():
                if isinstance(value, (list, tuple)) and value:
                    return f'{key}: {value[0]}'
                return f'{key}: {value}'
        if isinstance(data, (list, tuple)) and data:
            return str(data[0])
        return 'Request failed'
