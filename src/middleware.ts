import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  const publicApiPaths = [
    '/api/auth/',
    '/api/webhooks/resend',
    '/api/repuestos/respuesta',
    '/api/repuestos/subir-factura',
    '/api/repuestos/confirmar-pago',
    '/api/repuestos/almacen',
    '/api/portal-clientes/aceptar',
    '/api/corporativo/cuestionario',
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
    '/link-ventas', '/pagos-portal', '/historial', '/corporativo', '/api/',
  ]
  const isProtected = pathname === '/' || protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const esCliente = user?.app_metadata?.rol === 'cliente'

  // Si ya está autenticado y va al login, redirige al dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL(esCliente ? '/portal/inicio' : '/ingresos', request.url))
  }

  // Usuario staff intentando entrar al portal del cliente -> redirigir a ingresos
  if (pathname.startsWith('/portal') && user && !esCliente && !pathname.startsWith('/portal/registro')) {
    return NextResponse.redirect(new URL('/ingresos', request.url))
  }

  // Cliente intentando entrar al Centro de Mando -> redirigir a portal
  if (isProtected && esCliente && !pathname.startsWith('/api/portal-clientes')) {
    return NextResponse.redirect(new URL('/portal/inicio', request.url))
  }

  // Cliente no autenticado en rutas protegidas del portal
  const portalProtegido = ['/portal/inicio', '/portal/vehiculos', '/portal/credito', '/portal/cotizaciones', '/portal/pagos', '/portal/perfil']
  if (portalProtegido.some(p => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/portal/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
