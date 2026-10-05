import { createFileRoute } from '@tanstack/react-router'
import { ProductForm } from '@/features/products'

// The static segment `add` wins over the dynamic `$productId` sibling.
export const Route = createFileRoute('/_authenticated/products/add')({
  component: () => <ProductForm mode="add" />,
})
