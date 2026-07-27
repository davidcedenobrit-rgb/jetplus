'use client'

// Diagrama de vehículo (vista superior) para marcar daños en la recepción.
// Se hace clic sobre el dibujo para colocar una marca con el código elegido.
// Coordenadas en el espacio del viewBox 220 x 120 (mismas que usa el PDF).

export type DamageMark = { x: number; y: number; codigo: number }

export const DAMAGE_CODES: { codigo: number; label: string }[] = [
  { codigo: 1, label: 'Rayón leve' },
  { codigo: 2, label: 'Choque leve' },
  { codigo: 3, label: 'Mancha' },
  { codigo: 4, label: 'Roto' },
  { codigo: 5, label: 'Rayón fuerte' },
  { codigo: 6, label: 'Choque fuerte' },
  { codigo: 7, label: 'Abollado' },
  { codigo: 8, label: 'Ausente' },
]

const BODY = '#374151'
const SOFT = '#9ca3af'
const LINE = '#d1d5db'

// Contorno del vehículo (compartido conceptualmente con el PDF).
function CarOutline() {
  return (
    <>
      <rect x={30} y={25} width={160} height={70} rx={18} fill="#ffffff" stroke={BODY} strokeWidth={1.6} />
      <rect x={78} y={40} width={64} height={40} rx={8} fill="none" stroke={SOFT} strokeWidth={1} />
      <line x1={64} y1={26} x2={64} y2={94} stroke={LINE} strokeWidth={1} />
      <line x1={156} y1={26} x2={156} y2={94} stroke={LINE} strokeWidth={1} />
      {/* Ruedas */}
      <rect x={44} y={19} width={16} height={7} rx={2} fill={BODY} />
      <rect x={160} y={19} width={16} height={7} rx={2} fill={BODY} />
      <rect x={44} y={94} width={16} height={7} rx={2} fill={BODY} />
      <rect x={160} y={94} width={16} height={7} rx={2} fill={BODY} />
      {/* Espejos */}
      <rect x={72} y={22} width={7} height={4} rx={1.5} fill={SOFT} />
      <rect x={72} y={94} width={7} height={4} rx={1.5} fill={SOFT} />
      {/* Etiquetas */}
      <text x={12} y={63} fontSize={7} fill={SOFT}>Frente</text>
      <text x={196} y={63} fontSize={7} fill={SOFT}>Cola</text>
      <text x={100} y={13} fontSize={7} fill={SOFT}>Izquierdo</text>
      <text x={102} y={116} fontSize={7} fill={SOFT}>Derecho</text>
    </>
  )
}

export function CarDiagram({ marks, onAdd, onRemove, readOnly }: {
  marks: DamageMark[]
  onAdd?: (x: number, y: number) => void
  onRemove?: (i: number) => void
  readOnly?: boolean
}) {
  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (readOnly || !onAdd) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 220
    const y = ((e.clientY - r.top) / r.height) * 120
    onAdd(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }
  return (
    <svg viewBox="0 0 220 120" className={`w-full h-auto rounded-lg border border-gray-200 bg-white ${readOnly ? '' : 'cursor-crosshair'}`} onClick={handleClick}>
      <CarOutline />
      {marks.map((m, i) => (
        <g key={i} onClick={(e) => { if (!readOnly && onRemove) { e.stopPropagation(); onRemove(i) } }} className={readOnly ? '' : 'cursor-pointer'}>
          <circle cx={m.x} cy={m.y} r={7} fill="#C41E3A" stroke="#ffffff" strokeWidth={1} />
          <text x={m.x} y={m.y + 2.6} fontSize={8} fill="#ffffff" textAnchor="middle" fontWeight="bold">{m.codigo}</text>
        </g>
      ))}
    </svg>
  )
}
