import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  const publicApiPaths = [
    '/api/webhooks/resend',
    '/api/repuestos/respuesta',
    '/api/repuestos/subir-factura',
    '/api/repuestos/confirmar-pago',
    '/api/repuestos/almacen',
  ]

  if (publicApiPaths.some(path => pathname.startsWith(path))) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas protegidas — redirige al login si no hay sesión
  const protectedPaths = [
    '/dashboard', '/clientes', '/vehiculos', '/ingresos', '/egresos',
    '/reportes', '/creditos', '/acuerdos', '/showroom', '/tasas',
    '/aprobaciones', '/anulaciones', '/auditoria', '/logs', '/importar',
    '/vehimotors', '/carla', '/repuestos', '/documentos-empresa',
    '/link-ventas', '/api/',
  ]
  const isProtected = pathname === '/' || protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si ya está autenticado y va al login, redirige al dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/ingresos', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
