// Imprime un PDF (por URL o por Blob ya descargado) sin salir de la app: lo
// carga en un iframe oculto y dispara el diálogo de impresión nativo del
// navegador sobre ese iframe. Si algo falla, cae a abrirlo en una pestaña
// nueva (el usuario puede imprimir desde el visor nativo).
function imprimirBlobUrl(blobUrl: string, onDone?: () => void) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.src = blobUrl
  document.body.appendChild(iframe)
  iframe.onload = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch { /* el visor del navegador maneja el resto */ }
    onDone?.()
    // Se deja el iframe un rato para que el diálogo de impresión termine de usarlo.
    setTimeout(() => { iframe.remove(); URL.revokeObjectURL(blobUrl) }, 60000)
  }
}

export async function imprimirPdfDesdeUrl(url: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('no pdf')
    const blob = await res.blob()
    imprimirBlobUrl(URL.createObjectURL(blob))
  } catch {
    window.open(url, '_blank')
  }
}

export function imprimirPdfBlob(blob: Blob) {
  imprimirBlobUrl(URL.createObjectURL(blob))
}

// Fuerza la descarga de un Blob con el nombre dado (para PDFs generados por
// POST que no tienen una URL propia, como la cotización rápida).
export function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
