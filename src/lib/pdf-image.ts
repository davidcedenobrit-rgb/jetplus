import sharp from 'sharp'

interface PrepararImagenOpts {
  maxWidth: number
  quality: number
}

// Descarga una imagen y la deja lista para incrustar en un PDF: redimensionada,
// aplanada sobre blanco (las fotos vienen en PNG con transparencia, que en JPEG
// se vuelve negra) y comprimida a JPEG. Nunca lanza — si algo falla, devuelve
// undefined y quien llama sigue sin la imagen en vez de romper el documento.
export async function prepararImagenPdf(url: string, { maxWidth, quality }: PrepararImagenOpts): Promise<string | undefined> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
    if (!res.ok) return undefined

    const buf = Buffer.from(await res.arrayBuffer())
    const jpeg = await sharp(buf)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality })
      .toBuffer()

    return `data:image/jpeg;base64,${jpeg.toString('base64')}`
  } catch {
    return undefined
  }
}
