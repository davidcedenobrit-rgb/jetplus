// Construye el enlace de WhatsApp (wa.me) con un mensaje listo que incluye el
// link al PDF de la cotización. La vendedora solo pulsa "enviar".
// Si no hay teléfono, se abre WhatsApp sin destinatario (el usuario lo elige).
export function waCotizacionUrl(opts: {
  numero: string
  marca: string
  modelo: string
  telefono?: string | null
  clienteNombre?: string | null
  pdfUrl: string
}): string {
  const digits = (opts.telefono || '').replace(/\D/g, '')
  const phone = !digits
    ? ''
    : digits.startsWith('58') ? digits
    : digits.startsWith('0') ? '58' + digits.slice(1)
    : '58' + digits

  const saludo = opts.clienteNombre?.trim() ? `Estimado/a ${opts.clienteNombre.trim()},` : 'Estimado/a cliente,'
  const msg = [
    saludo,
    '',
    `Le compartimos su cotización ${opts.numero} — ${opts.marca} ${opts.modelo}.`,
    '',
    `📄 Ver / descargar el PDF: ${opts.pdfUrl}`,
    '',
    'Quedamos atentos a cualquier consulta.',
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}
