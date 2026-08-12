import React from 'react'
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'

// Membrete TOP compartido por TODOS los PDF del centro de mando.
// Muestra el logo, datos legales y colores del concesionario de turno.
// Colores por defecto: rojo #C41E3A + negro #111827 (Jetplus).

export const LOGO_LA_ORIENTAL = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'

export interface MembreteData {
  nombre: string
  rif?: string | null
  direccion?: string | null
  telefono?: string | null
  correo?: string | null
  logoSrc?: string
  colorPrimario?: string
  colorSecundario?: string
}

const GRAY = '#6b7280'

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  logo: { width: 200, height: 42, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end', maxWidth: '58%' },
  companyName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold' },
  companyRif: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  companyLine: { fontSize: 7, color: GRAY, marginTop: 0.5, textAlign: 'right' },
})

// Encabezado con logo + datos, y una línea inferior del color primario.
export function PdfMembrete({ data }: { data: MembreteData }) {
  const primario = data.colorPrimario || '#C41E3A'
  const secundario = data.colorSecundario || '#111827'
  const dir = (data.direccion || '').replace(/\n/g, ' · ')
  const contacto = [data.telefono, data.correo].filter(Boolean).join(' · ')
  return (
    <View style={[s.header, { borderBottom: `1.5pt solid ${primario}` }]}>
      <Image src={data.logoSrc ?? LOGO_LA_ORIENTAL} style={s.logo} />
      <View style={s.companyBlock}>
        <Text style={[s.companyName, { color: secundario }]}>{data.nombre}</Text>
        {data.rif ? <Text style={[s.companyRif, { color: primario }]}>RIF: {data.rif}</Text> : null}
        {dir ? <Text style={s.companyLine}>{dir}</Text> : null}
        {contacto ? <Text style={s.companyLine}>{contacto}</Text> : null}
      </View>
    </View>
  )
}
