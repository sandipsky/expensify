/**
 * Crops the middle square out of an image file and scales it down to at most
 * `edge` pixels a side, as a JPEG data URL: a profile photo small enough to
 * store on the profile itself. Resolves to null when the browser can't read
 * the file as an image.
 */
export async function squareThumbnail(file: File, edge: number): Promise<string | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const size = Math.min(edge, side)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return null
  }
  // JPEG has no transparency; white keeps a transparent PNG from turning black.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, size, size)
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  )
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
