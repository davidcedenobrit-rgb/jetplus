// Marca del Centro de Mando por instancia (concesionario).
// Cada despliegue en Vercel define estas variables NEXT_PUBLIC_* con su marca;
// si no están, se usan los valores de La Oriental por defecto.
export const BRANDING = {
  // Login
  nombre:        process.env.NEXT_PUBLIC_MARCA_NOMBRE        ?? 'LA ORIENTAL',
  sub:           process.env.NEXT_PUBLIC_MARCA_SUB           ?? 'AUTOMOTORS',
  ubicacion:     process.env.NEXT_PUBLIC_MARCA_UBICACION     ?? 'MG & MAXUS · Maturín',
  emailPlaceholder: process.env.NEXT_PUBLIC_MARCA_EMAIL      ?? 'tu@laoriental.co',
  // Sidebar / header
  sidebarTitulo: process.env.NEXT_PUBLIC_MARCA_SIDEBAR       ?? 'CENTRO DE MANDO',
  sidebarSub:    process.env.NEXT_PUBLIC_MARCA_SIDEBAR_SUB   ?? 'La Oriental Automotors',
  iniciales:     process.env.NEXT_PUBLIC_MARCA_INICIALES     ?? 'LO',
  // Nombre corto de la marca para textos internos del Centro de Mando
  // (subtítulos, etiquetas, títulos de pestaña). En Ki Auto = 'Ki Auto'.
  marca:         process.env.NEXT_PUBLIC_MARCA_CORTA         ?? 'La Oriental',
  // Nombre comercial completo (razón social sin la parte legal C.A.).
  empresa:       process.env.NEXT_PUBLIC_MARCA_EMPRESA       ?? 'La Oriental Automotors',
}
