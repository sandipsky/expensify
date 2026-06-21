"""Pagination that emits the ``IPaginatedResponse<T>`` shape (see CLAUDE.md)."""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    # The frontend fetches full lists and aggregates client-side, so allow a
    # large page size on request.
    max_page_size = 1000

    def get_paginated_response(self, data) -> Response:
        return Response(
            {
                'data': data,
                'pagination': {
                    'page': self.page.number,
                    'pageSize': self.get_page_size(self.request) or self.page_size,
                    'total': self.page.paginator.count,
                    'totalPages': self.page.paginator.num_pages,
                },
            }
        )
