'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, X } from 'lucide-react'
import { actualizarEmpleado, type EmpleadoEdit } from './editar-actions'

type Empleado = { id: string } & Partial<EmpleadoEdit>

const FRECS = ['Mensual', 'Quincenal', 'Semanal']
const CONTRATOS = ['Fijo', 'Contratado', 'Pasante', 'Honorarios']

export default function EditarFichaButton({ empleado }: { empleado: Empleado }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [f, setF] = useState<EmpleadoEdit>({
    nombre: empleado.nombre ?? '',
    cedula: empleado.cedula ?? '',
    telefono: empleado.telefono ?? '',
    correo: empleado.correo ?? '',
    correo_empresa: empleado.correo_empresa ?? '',
    fecha_ingreso: empleado.fecha_ingreso ?? '',
    fecha_nacimiento: empleado.fecha_nacimiento ?? '',
    direccion: empleado.direccion ?? '',
    cargo: empleado.cargo ?? '',
    departamento: empleado.departamento ?? '',
    reporta_a: empleado.reporta_a ?? '',
    tipo_contrato: empleado.tipo_contrato ?? '',
    salario: empleado.salario ?? null,
    salario_moneda: empleado.salario_moneda ?? 'USD',
    salario_frecuencia: empleado.salario_frecuencia ?? 'Mensual',
    cuenta_banco: empleado.cuenta_banco ?? '',
    contacto_emergencia_nombre: empleado.contacto_emergencia_nombre ?? '',
    contacto_emergencia_telefono: empleado.contacto_emergencia_telefono ?? '',
  })
  const set = (patch: Partial<EmpleadoEdit>) => setF(p => ({ ...p, ...patch }))

  const [salarioTxt, setSalarioTxt] = useState(empleado.salario != null ? String(empleado.salario) : '')

  async function guardar() {
    setError('')
    if (!f.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    const res = await actualizarEmpleado(empleado.id, {
      ...f,
      salario: salarioTxt.trim() ? Number(salarioTxt.replace(',', '.')) : null,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-oriental-gray hover:bg-gray-50">
        <Pencil size={14} /> Editar ficha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-oriental-black text-lg">Editar ficha</h2>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
            </div>

            <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider mb-2">Datos personales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div><label className="label">Nombre *</label><input className="input" value={f.nombre} onChange={e => set({ nombre: e.target.value })} /></div>
              <div><label className="label">Cédula / RIF</label><input className="input font-mono" value={f.cedula ?? ''} onChange={e => set({ cedula: e.target.value })} /></div>
              <div><label className="label">Teléfono</label><input className="input" value={f.telefono ?? ''} onChange={e => set({ telefono: e.target.value })} /></div>
              <div><label className="label">Fecha de nacimiento</label><input className="input" type="date" value={f.fecha_nacimiento ?? ''} onChange={e => set({ fecha_nacimiento: e.target.value })} /></div>
              <div><label className="label">Correo personal</label><input className="input" type="email" value={f.correo ?? ''} onChange={e => set({ correo: e.target.value })} /></div>
              <div><label className="label">Correo empresa</label><input className="input" type="email" value={f.correo_empresa ?? ''} onChange={e => set({ correo_empresa: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="label">Dirección</label><input className="input" value={f.direccion ?? ''} onChange={e => set({ direccion: e.target.value })} /></div>
            </div>

            <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider mb-2">Cargo y contrato</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div><label className="label">Cargo</label><input className="input" value={f.cargo ?? ''} onChange={e => set({ cargo: e.target.value })} /></div>
              <div><label className="label">Departamento</label><input className="input" value={f.departamento ?? ''} onChange={e => set({ departamento: e.target.value })} /></div>
              <div><label className="label">Reporta a</label><input className="input" value={f.reporta_a ?? ''} onChange={e => set({ reporta_a: e.target.value })} /></div>
              <div><label className="label">Fecha de ingreso</label><input className="input" type="date" value={f.fecha_ingreso ?? ''} onChange={e => set({ fecha_ingreso: e.target.value })} /></div>
              <div>
                <label className="label">Tipo de contrato</label>
                <select className="select" value={f.tipo_contrato ?? ''} onChange={e => set({ tipo_contrato: e.target.value })}>
                  <option value="">—</option>
                  {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider mb-2">Nómina y emergencia</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Salario</label>
                <div className="flex gap-1">
                  <input className="input flex-1" type="text" inputMode="decimal" placeholder="0,00" value={salarioTxt} onChange={e => setSalarioTxt(e.target.value)} />
                  {(['USD', 'VES'] as const).map(m => (
                    <button key={m} type="button" onClick={() => set({ salario_moneda: m })}
                      className={`px-2 rounded-lg text-xs font-semibold border ${f.salario_moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Frecuencia de pago</label>
                <select className="select" value={f.salario_frecuencia ?? ''} onChange={e => set({ salario_frecuencia: e.target.value })}>
                  <option value="">—</option>
                  {FRECS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2"><label className="label">N° de cuenta bancaria</label><input className="input font-mono" value={f.cuenta_banco ?? ''} onChange={e => set({ cuenta_banco: e.target.value })} /></div>
              <div><label className="label">Contacto de emergencia</label><input className="input" value={f.contacto_emergencia_nombre ?? ''} onChange={e => set({ contacto_emergencia_nombre: e.target.value })} /></div>
              <div><label className="label">Teléfono de emergencia</label><input className="input" value={f.contacto_emergencia_telefono ?? ''} onChange={e => set({ contacto_emergencia_telefono: e.target.value })} /></div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-4"><p className="text-xs text-red-800">{error}</p></div>}

            <div className="flex gap-2 pt-5">
              <button onClick={() => !saving && setOpen(false)} disabled={saving} className="flex-1 btn-secondary py-2.5">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Guardar ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
