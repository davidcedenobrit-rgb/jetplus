// ── Lanzamiento Jetplus (pedido David, 2026-08-13) ────────────────────
// Gustavo arranca solo con Ventas y Clientes; el resto del Centro de Mando
// queda oculto (no solo deshabilitado) hasta que él pida activarlo módulo
// por módulo. Para restaurar el menú completo, poner MOSTRAR_TODO_EL_MENU
// en true. Para activar una sección puntual, agregar su id a
// SECCIONES_VISIBLES; para un link puntual dentro de "Ventas y Clientes",
// agregarlo a LINKS_VENTAS_VISIBLES. Usado por Sidebar.tsx y por el
// redirect post-login.
export const MOSTRAR_TODO_EL_MENU = false
export const SECCIONES_VISIBLES = new Set(['ventas'])
export const LINKS_VENTAS_VISIBLES = new Set(['/gestion-ventas', '/clientes', '/link-ventas', '/historial'])
export const MOSTRAR_DASHBOARD_Y_TAREAS = false

// A dónde aterriza el usuario justo después de iniciar sesión.
export const RUTA_POST_LOGIN = (MOSTRAR_TODO_EL_MENU || MOSTRAR_DASHBOARD_Y_TAREAS) ? '/dashboard' : '/gestion-ventas'
