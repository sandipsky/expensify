import { Link } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/lib'
import { useDeleteProduct, useProducts } from '../product.query'

export const ProductList = () => {
  const { data: products, isLoading, isError, error } = useProducts()
  const deleteProduct = useDeleteProduct()

  const onDelete = (id: number, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      deleteProduct.mutate(id)
    }
  }

  if (isLoading) return <p>Loading products...</p>
  if (isError) return <div className="alert">{getApiErrorMessage(error)}</div>

  return (
    <>
      <div className="page-title">
        <h1>Products</h1>
        <Link className="btn" to="/products/add">
          Add product
        </Link>
      </div>

      {deleteProduct.isError && (
        <div className="alert">{getApiErrorMessage(deleteProduct.error)}</div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Price</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products?.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No products yet.
              </td>
            </tr>
          )}
          {products?.map((product, index) => (
            <tr key={product.id}>
              <td>{index + 1}</td>
              <td>{product.name}</td>
              <td>{product.price}</td>
              <td>{product.description}</td>
              <td>
                <div className="actions">
                  <Link
                    className="btn btn-secondary btn-sm"
                    to="/products/$productId"
                    params={{ productId: String(product.id) }}
                  >
                    View
                  </Link>
                  <Link
                    className="btn btn-secondary btn-sm"
                    to="/products/$productId/edit"
                    params={{ productId: String(product.id) }}
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() => onDelete(product.id, product.name)}
                    disabled={deleteProduct.isPending}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
