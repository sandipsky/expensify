/** No-break, narrow no-break and thin spaces. */
const SPECIAL_SPACES = new RegExp(`[${String.fromCharCode(0xa0, 0x2009, 0x202f)}]`, 'g')

/**
 * The built-in PDF fonts cover Latin text only, so the arrow, the minus sign
 * and the special spaces some locales format with (no-break, narrow no-break,
 * thin) get ASCII stand-ins.
 */
export function pdfText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/−/g, '-')
    .replace(SPECIAL_SPACES, ' ')
}

/** The table header fill the exports share: the app's accent blue. */
export const PDF_HEAD_FILL: [number, number, number] = [36, 86, 230]

/** jsPDF and its table plugin, loaded on first use so they stay out of the main bundle. */
export async function loadPdf() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable }
}
