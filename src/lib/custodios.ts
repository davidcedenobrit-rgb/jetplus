// Custodios fijos: personas que pueden tener el efectivo / dinero "en la mano".
// Se usan tanto en el modal de aprobación de ingresos como en el panel de Carla.
//
// Nota: los usuarios del sistema están cargados con rol 'admin' (no con roles
// personales), por eso el custodio NO se resuelve por rol. Estos custodios se
// guardan como texto en `custodio_externo` para que funcionen siempre, sin
// depender del rol del usuario en la tabla `usuarios`.

export const CUSTODIOS_FIJOS: Array<{ value: string; label: string }> = [
  { value: 'José (Rojas)', label: 'José (Rojas)' },
  { value: 'Carla',        label: 'Carla' },
  { value: 'Mary',         label: 'Mary' },
  { value: 'Leysdem',      label: 'Leysdem' },
]

// Canal de destino → custodio sugerido por defecto (cuando aplica).
export const CANAL_A_CUSTODIO_DEFAULT: Record<string, string> = {
  personal_jose:    'José (Rojas)',
  personal_carla:   'Carla',
  personal_mary:    'Mary',
  personal_leysdem: 'Leysdem',
}

// Set de nombres canónicos, para reconocerlos en las vistas (ej. panel de Carla)
// y mostrarlos como custodios normales en vez de "externos".
export const NOMBRES_CUSTODIOS_FIJOS = new Set(CUSTODIOS_FIJOS.map(c => c.value))
