import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/lib'
import { useCreateProduct, useProduct, useUpdateProduct } from '../product.query'

type ProductFormProps = {
  mode: 'add' | 'edit' | 'view'
  productId?: string // present for edit + view, absent for add
}

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number({ error: 'Price must be a number' }).positive('Price must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
})

type ProductFormValues = z.infer<typeof productSchema>

export const ProductForm = ({ mode, productId }: ProductFormProps) => {
  const id = Number(productId)
  const navigate = useNavigate()

  // Only fetch when there is an id to fetch (edit/view) - never for "add".
  const product = useProduct(id, mode !== 'add')
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', price: 0, description: '' },
    // `values` is reactive: once the product arrives, the form fills itself in.
    values: product.data
      ? {
          name: product.data.name,
          price: product.data.price,
          description: product.data.description,
        }
      : undefined,
  })

  const onSubmit = (values: ProductFormValues) => {
    const backToList = () => navigate({ to: '/products' })

    if (mode === 'edit') {
      updateProduct.mutate({ id, body: values }, { onSuccess: backToList })
    } else {
      createProduct.mutate(values, { onSuccess: backToList })
    }
  }

  if (mode !== 'add' && product.isLoading) return <p>Loading product...</p>
  if (mode !== 'add' && product.isError) {
    return <div className="alert">{getApiErrorMessage(product.error)}</div>
  }

  if (mode === 'view') {
    return (
      <div className="card">
        <div className="page-title">
          <h1>{product.data?.name}</h1>
          <div className="form-actions">
            <Link className="btn btn-secondary" to="/products">
              Back
            </Link>
            <Link className="btn" to="/products/$productId/edit" params={{ productId: String(id) }}>
              Edit
            </Link>
          </div>
        </div>
        <p>
          <strong>Price:</strong> {product.data?.price}
        </p>
        <p>
          <strong>Description:</strong> {product.data?.description}
        </p>
      </div>
    )
  }

  const saving = createProduct.isPending || updateProduct.isPending
  const saveError = createProduct.error ?? updateProduct.error

  return (
    <div className="card">
      <h1>{mode === 'edit' ? 'Edit product' : 'Add product'}</h1>

      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" {...register('name')} />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </div>

        <div className="field">
          <label htmlFor="price">Price</label>
          {/* Inputs give strings; valueAsNumber converts so zod sees a number */}
          <input id="price" type="number" step="any" {...register('price', { valueAsNumber: true })} />
          {errors.price && <span className="error">{errors.price.message}</span>}
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={3} {...register('description')} />
          {errors.description && <span className="error">{errors.description.message}</span>}
        </div>

        {saveError && <div className="alert">{getApiErrorMessage(saveError)}</div>}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <Link className="btn btn-secondary" to="/products">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
