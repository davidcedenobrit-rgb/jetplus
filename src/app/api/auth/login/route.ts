import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { LoginSchema } from '@/lib/validations'

// Rate limiting en memoria: 5 intentos / IP / 15 min
const attempts = new Map<string, { count: number; resetAt: number }>()
const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: LIMIT - 1 }
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: LIMIT - entry.count }
}

function resetAttempts(ip: string) {
  attempts.delete(ip)
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { allowed, remaining } = checkRateLimit(ip)

  if (!allowed) {
    console.warn(`[AUTH] Rate limit excedido IP=${ip}`)
    return NextResponse.json(
      { error: 'Demasiados intentos fallidos. Espera 15 minutos.' },
      {
        status: 429,
        headers: {
          'Retry-After': '900',
          'X-RateLimit-Limit': String(LIMIT),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)

  if (!parsed.success) {
    console.warn(`[AUTH] Input inválido IP=${ip}`)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { email, password } = parsed.data

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: { name: string; value: string; options?: any }[]) => {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Log sin exponer el correo completo
    const emailMasked = `${email.slice(0, 3)}***@${email.split('@')[1] ?? '?'}`
    console.warn(`[AUTH] Login fallido email=${emailMasked} IP=${ip} intentos_restantes=${remaining}`)
    return NextResponse.json(
      { error: 'Correo o contraseña incorrectos' },
      { status: 401, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    )
  }

  resetAttempts(ip)
  return NextResponse.json({ success: true })
}
