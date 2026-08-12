// Datos legales del VENDEDOR (concesionario de turno) para el contrato de venta
// a crédito con reserva de dominio. Estos datos NO están en la base porque son
// del registro mercantil de cada concesionario; se configuran aquí por id.
//
// Cuando falte un dato, se renderiza un espacio "____" para llenar a mano, de
// modo que el contrato nunca muestre datos inventados.

export interface VendedorLegal {
  // Nombre legal (si se omite, se usa el nombre del membrete del concesionario).
  nombre?: string
  rif?: string
  // Registro mercantil de constitución.
  registro?: string        // p.ej. "Registro Mercantil Primero de la Circunscripción Judicial del estado Monagas"
  registroFecha?: string   // p.ej. "18 de marzo de 2021"
  registroNro?: string     // p.ej. "12"
  registroTomo?: string    // p.ej. "36-A"
  // Representante que firma el contrato.
  representante?: string   // nombre completo
  representanteCedula?: string
  representanteCargo?: string // p.ej. "Director"
  // Domicilio especial (jurisdicción) para la cláusula final.
  domicilioEspecial?: string  // p.ej. "Maturín, estado Monagas"
}

const VENDEDORES: Record<string, VendedorLegal> = {
  'jetplus': {
    rif: 'J-50372874-4',
    // Registro Mercantil pendiente por confirmar con el cliente — se deja en
    // blanco a propósito (ver nota arriba) hasta tener el dato real.
    domicilioEspecial: 'Porlamar, estado Nueva Esparta',
  },
  'la-oriental': {
    nombre: 'LA ORIENTAL AUTOMOTORS, C.A.',
    rif: 'J-505692143',
    // Registro Mercantil del Estado Monagas — RM No. 391, Tomo 34-A, Número 24, año 2024
    // (expediente 391-57832). Fuente: certificado SAREN aportado por el cliente.
    registro: 'Registro Mercantil del Estado Monagas',
    registroFecha: '2024',
    registroNro: '24',
    registroTomo: '34-A',
    representante: 'JOSÉ GREGORIO ROJAS YÁNEZ',
    representanteCedula: 'V-15.788.401',
    representanteCargo: 'Director',
    domicilioEspecial: 'Maturín, estado Monagas',
  },
  'kiauto': {
    nombre: 'KI AUTO, C.A.',
    representanteCargo: 'Director',
    domicilioEspecial: 'Puerto Ordaz, estado Bolívar',
  },
  'autosurca': {
    nombre: 'AUTOSURCA, C.A.',
    representanteCargo: 'Director',
    domicilioEspecial: 'El Tigre, estado Anzoátegui',
  },
}

export function getVendedorLegal(id: string | null | undefined): VendedorLegal {
  return VENDEDORES[id ?? 'jetplus'] ?? VENDEDORES['jetplus']
}
