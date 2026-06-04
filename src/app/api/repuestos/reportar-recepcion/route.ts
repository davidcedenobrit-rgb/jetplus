export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarReporteRecepcion } from '@/lib/email-repuestos'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData      = await req.formData()
    const solicitudId   = formData.get('solicitudId') as string
    const tieneNovedad  = formData.get('tieneNovedad') === 'true'
    const notas         = formData.get('notas') as string | null
    const fotoFile      = formData.get('foto') as File | null
    const userEmail     = formData.get('userEmail') as string

    if (!solicitudId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

    const { data: sol } = await supabase
      .from('solicitudes_repuestos')
      .select('numero')
      .eq('id', solicitudId).single()

    if (!sol) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    let fotoUrl: string | null = null
    if (tieneNovedad && fotoFile && fotoFile.size > 0) {
      const bytes  = await fotoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const path   = `repuestos/${solicitudId}/novedad-${Date.now()}.${fotoFile.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, buffer, {
        contentType: fotoFile.type, upsert: false,
      })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
        fotoUrl = urlData.publicUrl
      }
    }

    await supabase.from('solicitudes_repuestos').update({
      estado: 'completado',
      novedad_recepcion: tieneNovedad ? (notas || null) : null,
      novedad_foto_url: fotoUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', solicitudId)

    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitudId,
      estado_nuevo: 'completado',
      usuario_email: userEmail,
      notas: tieneNovedad
        ? `Completado con novedad: ${notas ?? '(sin descripción)'}`
        : 'Completado sin novedad',
    })

    await enviarReporteRecepcion({
      numero: sol.numero, solicitudId,
      tieneNovedad, notas: notas || null, fotoUrl,
    })

    revalidatePath('/repuestos')
    revalidatePath(`/repuestos/${solicitudId}`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
