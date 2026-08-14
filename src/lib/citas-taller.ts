// Reglas del agendamiento del taller: lunes a viernes, 7:00am a 5:00pm,
// slots de 1.5h (1 carro por slot). Compartido entre el link público /citas
// y la API para que ambos lados acuerden exactamente los mismos horarios.
export const SLOTS_HORA = ['07:00', '08:30', '10:00', '11:30', '13:00', '14:30'] as const
export const DURACION_MINUTOS = 90

export function horaFin(horaInicio: string): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + DURACION_MINUTOS
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// fechaISO en formato 'YYYY-MM-DD'. Se construye con año/mes/día locales
// (no `new Date(fechaISO)`) para no correr el día por husos horarios.
export function esDiaHabil(fechaISO: string): boolean {
  const [y, m, d] = fechaISO.split('-').map(Number)
  if (!y || !m || !d) return false
  const dow = new Date(y, m - 1, d).getDay()
  return dow >= 1 && dow <= 5
}
