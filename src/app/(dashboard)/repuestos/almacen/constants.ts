// Constantes del almacén. Va aparte de actions.ts porque un archivo con
// 'use server' SOLO puede exportar funciones async (no objetos/constantes).

export const TALLERES = [
  { key: 'la-oriental', label: 'Taller Jetplus' },
  { key: 'ki-auto', label: 'Taller Ki Auto' },
  { key: 'autosurca', label: 'Taller Autosurca' },
] as const

export type TallerKey = typeof TALLERES[number]['key']
