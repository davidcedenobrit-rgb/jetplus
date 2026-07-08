export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { ShowroomListadoPDF } from '@/lib/showroom-listado-pdf'

const TAB_LABEL: Record<string, string> = {
  todos: 'Todos',
  en_agencia: 'Disponibles',
  reservado: 'Reservados',
  en_taller: 'En taller',
  vendido: 'Vendidos',
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const url = new URL(req.url)
  const tab = url.searchParams.get('tab') ?? 'todos'

  let query = supabase
    .from('vehiculos_showroom')
    .select('marca, modelo, version, anio, color, placa, vin, serial_motor, estado, ubicacion, ubicacion_descripcion, proforma_vehimotors')
    .order('created_at', { ascending: false })

  if (tab !== 'todos') query = query.eq('estado', tab)

  const { data: filas } = await query

  const fecha = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
  const titulo = TAB_LABEL[tab] ?? 'Todos'

  const pdfBuffer = await renderToBuffer(
    React.createElement(ShowroomListadoPDF, {
      filas: (filas ?? []) as any,
      titulo,
      fecha,
    }) as any
  )

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="showroom-${tab}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
