import { createFileRoute } from '@tanstack/react-router'
import { ProductForm } from '@/features/products'

export const Route = createFileRoute('/_authenticated/products/$productId/')({
  component: ProductViewPage,
})

function ProductViewPage() {
  const { productId } = Route.useParams()
  return <ProductForm mode="view" productId={productId} />
}
