import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { RUTA_POST_LOGIN } from '@/lib/menu-config'

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
    '/api/corporativo/registro-publico',
    // Respuesta del cliente a una cotización desde el correo (sin sesión,
    // validado por token_respuesta). Sin esto, el POST se redirige al login
    // y el navegador recibe un 405.
    '/api/cotizaciones/responder',
    '/api/cotizaciones/solicitar-descuento',
    // Link público de ventas (/ventas): captación de leads, desplegable de
    // vendedores y tracking de eventos. Sin esto el POST del formulario se
    // redirige al login y el lead nunca se guarda.
    '/api/leads',
    '/api/ventas/vendedores',
    '/api/eventos',
    // Verificación del código de vendedor(a) desde el link público /ventas.
    // Sin esto el POST se redirige al login (307) y el navegador recibe HTML
    // en vez de JSON → "Error de conexión" al ingresar el código.
    '/api/vendedoras/verificar',
    // Panel propio de la vendedora (/ventas/panel): se autoriza por su código
    // dentro del handler, igual que /api/vendedoras/verificar. OJO: NO liberar
    // '/api/vendedoras' a secas — esa es el listado administrativo.
    '/api/vendedoras/panel',
    // PDF del "rapidito" (resumen de cotización) compartible desde el link.
    '/api/cotizacion-rapida/pdf',
    // Búsqueda de clientes desde el link de vendedores (validada por código de
    // vendedor(a) dentro del handler; no expone la base sin código válido).
    '/api/cotizaciones/clientes-buscar',
    // Lista de financiadoras (PIVCA/Vehimotors) para armar el presupuesto
    // desde el link público. El GET es publico por diseño (sin datos
    // sensibles); el PATCH (editar tasa) valida sesion+rol dentro del propio
    // handler. Sin esto, el middleware redirigia el fetch a /login (HTML en
    // vez de JSON) y la vendedora nunca podia elegir financiadora.
    '/api/financiadoras',
    // Link público de aliados (/aliados, /aliados/panel): verificación de
    // código, registro de leads referidos y su propio panel — mismo modelo
    // sin sesión que /api/vendedoras/*.
    '/api/aliados/verificar',
    '/api/aliados/lead',
    '/api/aliados/panel',
    // Link público de citas de taller (/citas): agendar (POST) y consultar
    // disponibilidad de horarios (GET) sin sesión. El GET de listado interno
    // en la misma ruta bare valida rol de staff dentro del propio handler,
    // igual que /api/leads.
    '/api/citas',
  ]

  // PDF de la cotización: público (se comparte al cliente por WhatsApp/correo).
  // La URL lleva un UUID no adivinable, mismo modelo que el token del correo.
  const esPdfCotizacionPublico = /^\/api\/cotizaciones\/[^/]+\/pdf$/.test(pathname)

  // PDF de la ficha técnica de un vehículo del catálogo: público, se compone
  // al pedirlo y se muestra/comparte desde el link de ventas (/ventas) sin
  // sesión. Solo el GET — cargar/borrar páginas (ficha-tecnica/subir) exige
  // sesión y por eso NO se libera aquí.
  const esPdfFichaTecnicaPublico = /^\/api\/catalogo\/[^/]+\/ficha$/.test(pathname) && request.method === 'GET'

  // Crear cotización desde el link público /ventas (POST exacto a /api/cotizaciones).
  // El propio handler valida el código de vendedor(a); el GET (listado) sigue
  // exigiendo sesión dentro del handler. Solo se libera la ruta EXACTA, no las
  // subrutas administrativas (/api/cotizaciones/[id], reactivar, etc.).
  const esCrearCotizacionPublica = pathname === '/api/cotizaciones'

  if (esPdfCotizacionPublico || esPdfFichaTecnicaPublico || esCrearCotizacionPublica || publicApiPaths.some(path => pathname.startsWith(path))) {
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
    '/gestion-ventas', '/base-datos',
  ]
  const isProtected = pathname === '/' || protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const esCliente = user?.app_metadata?.rol === 'cliente'

  // Si ya está autenticado y va al login, redirige a su landing normal
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL(esCliente ? '/portal/inicio' : RUTA_POST_LOGIN, request.url))
  }

  // Usuario staff intentando entrar al portal del cliente -> redirigir a su landing normal
  if (pathname.startsWith('/portal') && user && !esCliente && !pathname.startsWith('/portal/registro')) {
    return NextResponse.redirect(new URL(RUTA_POST_LOGIN, request.url))
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
