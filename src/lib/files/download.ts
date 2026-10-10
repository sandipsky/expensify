/**
 * Hands a file to the browser to save, as the exports do. The file is made
 * on the device, so it works without a server round trip.
 */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Some browsers read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
