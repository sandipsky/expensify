export interface IProduct {
  id: number
  name: string
  price: number
  description: string
}

// What the client sends when creating/updating - the server owns the id.
export type IProductBody = Omit<IProduct, 'id'>
