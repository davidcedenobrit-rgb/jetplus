// ── Lanzamiento Jetplus (pedido David, 2026-08-13) ────────────────────
// Gustavo arranca solo con Panel de Ventas (+ Logs del sistema y Manual de
// usuario); el resto del Centro de Mando queda oculto (no solo deshabilitado)
// hasta que él pida activarlo módulo por módulo. Auditoría se ocultó a
// pedido de David (2026-08-14): no se usa, solo queda "Logs del sistema"
// (cambios hechos) y "Manual de usuario" (guía de como funciona cada módulo).
// Para restaurar el menú completo, poner MOSTRAR_TODO_EL_MENU en true. Para
// activar una sección puntual, agregar su id a SECCIONES_VISIBLES. Para
// restringir los links DENTRO de una sección visible, agregar una entrada a
// LINKS_VISIBLES_POR_SECCION con el id de la sección; si una sección visible
// no tiene entrada ahí, se muestran todos sus links (una vez que la sección
// misma esté en SECCIONES_VISIBLES).
// Usado por Sidebar.tsx y por el redirect post-login.
export const MOSTRAR_TODO_EL_MENU = false
export const SECCIONES_VISIBLES = new Set(['ventas', 'admin'])
export const LINKS_VISIBLES_POR_SECCION: Record<string, Set<string>> = {
  ventas: new Set(['/gestion-ventas', '/gestion-ventas/aliados', '/gestion-ventas/redes', '/gestion-ventas/citas', '/clientes', '/link-ventas', '/historial']),
  admin: new Set(['/logs', '/manual']),
}
export const MOSTRAR_DASHBOARD_Y_TAREAS = false

// A dónde aterriza el usuario justo después de iniciar sesión.
export const RUTA_POST_LOGIN = (MOSTRAR_TODO_EL_MENU || MOSTRAR_DASHBOARD_Y_TAREAS) ? '/dashboard' : '/gestion-ventas'
