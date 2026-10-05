import { createFileRoute } from '@tanstack/react-router'
import { ProductForm } from '@/features/products'

export const Route = createFileRoute('/_authenticated/products/$productId/edit')({
  component: ProductEditPage,
})

function ProductEditPage() {
  const { productId } = Route.useParams()
  return <ProductForm mode="edit" productId={productId} />
}
