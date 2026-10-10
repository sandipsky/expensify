import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
  type WriteBatch,
} from 'firebase/firestore'
import { AppError } from '@/lib/errors'
import { db, toEntity, userCollection, userDoc } from '@/lib/firestore'
import { DEFAULT_CATEGORIES, compareCategories, isNameTaken, nextSortOrder } from './category.domain'
import type { ICategory, ICategoryBody } from './category.types'

// users/{uid}/categories. firestore.rules checks each document's fields;
// what needs the other categories, like unique names, is checked here.

const categoryDoc = (id: string) => userDoc('categories', id)

/** Every category, archived ones too, in list order. */
export const getCategories = async () => {
  const snapshot = await getDocs(userCollection('categories'))
  return snapshot.docs.map((d) => toEntity<ICategory>(d)).sort(compareCategories)
}

const getCategory = async (id: string) => {
  const snapshot = await getDoc(categoryDoc(id))
  if (!snapshot.exists()) throw new AppError('Category not found', 'not-found')
  return toEntity<ICategory>(snapshot)
}

// The fields a form may set; the rest belong to this module.
const categoryFields = (body: ICategoryBody) => ({
  name: body.name.trim(),
  type: body.type,
  icon: body.icon,
  color: body.color,
})

/** Names are unique per type, ignoring case; archived categories count too. */
const ensureNameFree = (categories: readonly ICategory[], body: ICategoryBody, id?: string) => {
  if (isNameTaken(categories, { ...body, id })) {
    throw new AppError(`You already have an ${body.type} category with this name`, 'taken', 'name')
  }
}

/** The type can't change, since entries of that type use the category. */
export const updateCategory = async (id: string, body: ICategoryBody) => {
  const categories = await getCategories()
  const existing = categories.find((c) => c.id === id)
  if (!existing) throw new AppError('Category not found', 'not-found')
  if (body.type !== existing.type) throw new Error("A category's type can't be changed")
  ensureNameFree(categories, body, id)
  await updateDoc(categoryDoc(id), { ...categoryFields(body), updatedAt: serverTimestamp() })
  return getCategory(id)
}

/** A new category goes to the end of its type's list. */
export const createCategory = async (body: ICategoryBody) => {
  const categories = await getCategories()
  ensureNameFree(categories, body)
  const ref = doc(userCollection('categories'))
  await setDoc(ref, {
    ...categoryFields(body),
    archived: false,
    sortOrder: nextSortOrder(categories, body.type),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return getCategory(ref.id)
}

/** Archived categories leave pickers; entries that use them keep them. */
export const setCategoryArchived = async (id: string, archived: boolean) => {
  await updateDoc(categoryDoc(id), { archived, updatedAt: serverTimestamp() })
  return getCategory(id)
}

/** Entries that use it stay, and show it as a deleted category. */
export const deleteCategory = async (id: string) => {
  await deleteDoc(categoryDoc(id))
}

/**
 * Adds the default categories missing from `existing` to `batch`, matched by
 * type and name, each at the end of its type's list. Signup seeds a new
 * account with them in its own batch. Resolves to the new documents.
 */
export function addDefaultsTo(batch: WriteBatch, existing: readonly ICategory[]) {
  const placed: Pick<ICategory, 'type' | 'sortOrder'>[] = [...existing]
  const refs: DocumentReference[] = []
  for (const entry of DEFAULT_CATEGORIES) {
    if (isNameTaken(existing, entry)) continue
    const sortOrder = nextSortOrder(placed, entry.type)
    placed.push({ type: entry.type, sortOrder })
    const ref = doc(userCollection('categories'))
    batch.set(ref, {
      ...entry,
      archived: false,
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    refs.push(ref)
  }
  return refs
}

/** Adds the default categories the user doesn't have yet; resolves to the ones added. */
export const addDefaultCategories = async () => {
  const batch = writeBatch(db)
  const refs = addDefaultsTo(batch, await getCategories())
  if (!refs.length) return []
  await batch.commit()
  return Promise.all(refs.map((ref) => getCategory(ref.id)))
}
