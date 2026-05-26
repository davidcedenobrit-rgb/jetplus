'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, Download, Check, X, AlertTriangle, ChevronRight,
  Users, Car, ArrowLeft, RefreshCw, FileText, Info
} from 'lucide-react'
import Link from 'next/link'

// ── CSV Parser simple y robusto (soporta comillas, ; y ,) ──────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const delim = text.indexOf(';') > text.indexOf(',') && text.split(';').length > text.split(',').length ? ';' : ','
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseLine(line: string): string[] {
    const result: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === delim && !inQuotes) {
        result.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const vals = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))

  return { headers, rows }
}

// ── Definición de campos por entidad ───────────────────────────────────────
const CLIENTE_FIELDS = [
  { key: 'nombre',      label: 'Nombre completo',  required: true,  hint: 'Ej: Juan Pérez' },
  { key: 'cedula_rif',  label: 'Cédula / RIF',     required: true,  hint: 'Ej: V-12345678 o J-12345678' },
  { key: 'telefono',    label: 'Teléfono',          required: false, hint: 'Ej: 0424-1234567' },
  { key: 'whatsapp',    label: 'WhatsApp',          required: false, hint: 'Ej: 0414-9876543' },
  { key: 'correo',      label: 'Correo electrónico',required: false, hint: 'Ej: juan@email.com' },
  { key: 'ciudad',      label: 'Ciudad',            required: false, hint: 'Ej: Maturín' },
  { key: 'direccion',   label: 'Dirección',         required: false, hint: 'Dirección completa' },
  { key: 'tipo',        label: 'Tipo',              required: false, hint: '"natural" o "juridico" (default: natural)' },
  { key: 'observaciones', label: 'Observaciones',  required: false, hint: 'Notas adicionales' },
]

const VEHICULO_FIELDS = [
  { key: 'cedula_cliente', label: 'Cédula del cliente', required: true,  hint: 'Debe coincidir con un cliente existente' },
  { key: 'marca',          label: 'Marca',              required: true,  hint: '"MG" o "MAXUS"' },
  { key: 'modelo',         label: 'Modelo',             required: true,  hint: 'Ej: MG5, T60' },
  { key: 'version',        label: 'Versión',            required: false, hint: 'Ej: Trophy, Luxury' },
  { key: 'anio',           label: 'Año',                required: false, hint: 'Ej: 2024' },
  { key: 'color',          label: 'Color',              required: false, hint: 'Ej: Blanco Polar' },
  { key: 'placa',          label: 'Placa',              required: false, hint: 'Ej: AA001BC' },
  { key: 'vin',            label: 'VIN / Serial',       required: false, hint: '17 caracteres' },
  { key: 'serial_motor',   label: 'Serial Motor',       required: false, hint: 'Número del motor' },
  { key: 'fecha_entrega',  label: 'Fecha de entrega',   required: false, hint: 'YYYY-MM-DD' },
  { key: 'tipo_compra',    label: 'Tipo de compra',     required: false, hint: '"contado" o "financiado" (default: contado)' },
  { key: 'observaciones',  label: 'Observaciones',      required: false, hint: 'Notas del vehículo' },
]

// Templates CSV para descargar
const CLIENTE_TEMPLATE = 'nombre,cedula_rif,telefono,whatsapp,correo,ciudad,tipo\nJuan Pérez,V-12345678,0424-1234567,0414-9876543,juan@email.com,Maturín,natural\nComercial ABC C.A.,J-12345678-1,0291-1234567,,info@abc.com,Maturín,juridico'
const VEHICULO_TEMPLATE = 'cedula_cliente,marca,modelo,version,anio,color,placa,vin,tipo_compra\nV-12345678,MG,MG5,Trophy,2024,Blanco Polar,AA001BC,LSJWXAJEXRW000001,contado\nV-12345678,MAXUS,T60,Luxury,2023,Negro Obsidiana,BB002CD,,financiado'

function downloadTemplate(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

type Tab = 'clientes' | 'vehiculos'
type Step = 'upload' | 'mapeo' | 'preview' | 'resultado'

interface RowValidation {
  row: Record<string, string>
  idx: number
  errors: string[]
  mapped: Record<string, string>
}

export default function ImportarPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('clientes')
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validations, setValidations] = useState<RowValidation[]>([])
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; errores: number; detalles: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fields = tab === 'clientes' ? CLIENTE_FIELDS : VEHICULO_FIELDS

  function resetAll() {
    setStep('upload')
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setValidations([])
    setResultado(null)
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    resetAll()
  }

  function processFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      alert('Solo se aceptan archivos .csv o .txt')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)
      if (!headers.length) { alert('El archivo no tiene columnas detectables.'); return }
      if (!rows.length) { alert('El archivo no tiene filas de datos.'); return }
      setCsvHeaders(headers)
      setCsvRows(rows)

      // Auto-mapeo inteligente: busca coincidencias por nombre similar
      const autoMap: Record<string, string> = {}
      fields.forEach(f => {
        const match = headers.find(h =>
          h.toLowerCase().replace(/[\s_\-]/g, '') ===
          f.key.toLowerCase().replace(/[\s_\-]/g, '') ||
          h.toLowerCase().includes(f.key.toLowerCase().split('_')[0])
        )
        if (match) autoMap[f.key] = match
      })
      setMapping(autoMap)
      setStep('mapeo')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  // ── Validar filas con el mapeo actual ─────────────────────────────────────
  function buildValidations(): RowValidation[] {
    return csvRows.map((row, idx) => {
      const mapped: Record<string, string> = {}
      fields.forEach(f => {
        const csvCol = mapping[f.key]
        mapped[f.key] = csvCol ? (row[csvCol] ?? '').trim() : ''
      })
      const errors: string[] = []
      fields.filter(f => f.required).forEach(f => {
        if (!mapped[f.key]) errors.push(`"${f.label}" es obligatorio`)
      })
      if (tab === 'clientes') {
        if (mapped.tipo && !['natural', 'juridico'].includes(mapped.tipo.toLowerCase())) {
          errors.push('Tipo debe ser "natural" o "juridico"')
        }
      }
      if (tab === 'vehiculos') {
        if (mapped.marca && !['MG', 'MAXUS'].includes(mapped.marca.toUpperCase())) {
          errors.push('Marca debe ser "MG" o "MAXUS"')
        }
        if (mapped.anio && isNaN(parseInt(mapped.anio))) {
          errors.push('Año debe ser un número')
        }
        if (mapped.tipo_compra && !['contado', 'financiado'].includes(mapped.tipo_compra.toLowerCase())) {
          errors.push('Tipo de compra debe ser "contado" o "financiado"')
        }
      }
      return { row, idx, errors, mapped }
    })
  }

  function goToPreview() {
    // Verificar que campos requeridos estén mapeados
    const requiredSinMapear = fields.filter(f => f.required && !mapping[f.key])
    if (requiredSinMapear.length > 0) {
      alert(`Mapea los campos obligatorios: ${requiredSinMapear.map(f => f.label).join(', ')}`)
      return
    }
    setValidations(buildValidations())
    setStep('preview')
  }

  // ── Importar ──────────────────────────────────────────────────────────────
  async function handleImport() {
    setLoading(true)
    let ok = 0
    const erroresDetalle: string[] = []
    const filasValidas = validations.filter(v => v.errors.length === 0)

    if (tab === 'clientes') {
      // Insertar en lotes de 50
      const lote = filasValidas.map(v => ({
        nombre: v.mapped.nombre,
        cedula_rif: v.mapped.cedula_rif,
        telefono: v.mapped.telefono || null,
        whatsapp: v.mapped.whatsapp || null,
        correo: v.mapped.correo || null,
        ciudad: v.mapped.ciudad || null,
        direccion: v.mapped.direccion || null,
        tipo: (['natural', 'juridico'].includes((v.mapped.tipo || '').toLowerCase())
          ? v.mapped.tipo.toLowerCase() : 'natural') as 'natural' | 'juridico',
        observaciones: v.mapped.observaciones || null,
        activo: true,
      }))

      // Insertar de a 50
      for (let i = 0; i < lote.length; i += 50) {
        const chunk = lote.slice(i, i + 50)
        const { error, data } = await supabase.from('clientes').insert(chunk).select('id')
        if (error) {
          erroresDetalle.push(`Lote ${Math.floor(i / 50) + 1}: ${error.message}`)
        } else {
          ok += data?.length ?? chunk.length
        }
      }
    }

    if (tab === 'vehiculos') {
      // Primero buscar todos los clientes referenciados
      const cedulas = [...new Set(filasValidas.map(v => v.mapped.cedula_cliente).filter(Boolean))]
      const { data: clientesDB } = await supabase
        .from('clientes').select('id, cedula_rif').in('cedula_rif', cedulas)

      const cedulaToId: Record<string, string> = {}
      ;(clientesDB ?? []).forEach((c: any) => { cedulaToId[c.cedula_rif] = c.id })

      for (const v of filasValidas) {
        const clienteId = cedulaToId[v.mapped.cedula_cliente]
        if (!clienteId) {
          erroresDetalle.push(`Fila ${v.idx + 2}: Cliente "${v.mapped.cedula_cliente}" no encontrado`)
          continue
        }
        const { error } = await supabase.from('vehiculos').insert({
          cliente_id: clienteId,
          marca: v.mapped.marca.toUpperCase() as 'MG' | 'MAXUS',
          modelo: v.mapped.modelo,
          version: v.mapped.version || null,
          anio: v.mapped.anio ? parseInt(v.mapped.anio) : null,
          color: v.mapped.color || null,
          placa: v.mapped.placa ? v.mapped.placa.toUpperCase() : null,
          vin: v.mapped.vin || null,
          serial_motor: v.mapped.serial_motor || null,
          fecha_entrega: v.mapped.fecha_entrega || null,
          tipo_compra: (['contado', 'financiado'].includes((v.mapped.tipo_compra || '').toLowerCase())
            ? v.mapped.tipo_compra.toLowerCase() : 'contado') as 'contado' | 'financiado',
          observaciones: v.mapped.observaciones || null,
          estado: 'entregado',
        })
        if (error) erroresDetalle.push(`Fila ${v.idx + 2}: ${error.message}`)
        else ok++
      }
    }

    setResultado({ ok, errores: erroresDetalle.length, detalles: erroresDetalle })
    setLoading(false)
    setStep('resultado')
  }

  const filasValidas = validations.filter(v => v.errors.length === 0).length
  const filasConError = validations.filter(v => v.errors.length > 0).length

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Importación masiva</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Carga clientes o vehículos desde un archivo CSV</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['clientes', Users, 'Clientes'], ['vehiculos', Car, 'Vehículos']] as const).map(([t, Icon, label]) => (
          <button
            key={t}
            onClick={() => handleTabChange(t as Tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              tab === t
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {(['upload', 'mapeo', 'preview', 'resultado'] as Step[]).map((s, i) => {
          const labels = ['Subir archivo', 'Mapear columnas', 'Previsualizar', 'Resultado']
          const isDone = ['upload', 'mapeo', 'preview', 'resultado'].indexOf(step) > i
          const isActive = step === s
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive ? 'bg-oriental-black text-white' :
                isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {isDone ? <Check size={12} /> : <span>{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 3 && <ChevronRight size={14} className="text-gray-300" />}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: UPLOAD ────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Descargar plantilla */}
          <div className="card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-oriental-black text-sm">Plantilla CSV</p>
                <p className="text-xs text-oriental-gray">Descarga el formato correcto para {tab === 'clientes' ? 'clientes' : 'vehículos'}</p>
              </div>
            </div>
            <button
              onClick={() => downloadTemplate(
                tab === 'clientes' ? CLIENTE_TEMPLATE : VEHICULO_TEMPLATE,
                tab === 'clientes' ? 'plantilla-clientes.csv' : 'plantilla-vehiculos.csv'
              )}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Download size={15} />
              Descargar plantilla
            </button>
          </div>

          {/* Campos requeridos */}
          <div className="card p-5">
            <p className="text-sm font-bold text-oriental-black mb-3 flex items-center gap-2">
              <Info size={15} className="text-oriental-gray" />
              Campos del CSV
            </p>
            <div className="grid grid-cols-2 gap-2">
              {fields.map(f => (
                <div key={f.key} className="flex items-start gap-2">
                  <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${f.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.required ? 'REQ' : 'OPC'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-oriental-black">{f.label}</p>
                    <p className="text-[11px] text-oriental-gray">{f.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            className={`card p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all border-2 border-dashed ${
              dragOver ? 'border-oriental-red bg-red-50' : 'border-gray-300 hover:border-oriental-red hover:bg-gray-50'
            }`}
          >
            <Upload size={36} className={dragOver ? 'text-oriental-red' : 'text-gray-400'} />
            <div className="text-center">
              <p className="font-semibold text-oriental-black">Arrastra tu CSV aquí</p>
              <p className="text-sm text-oriental-gray mt-1">o haz clic para seleccionar</p>
              <p className="text-xs text-oriental-gray mt-2">Formato: .csv · Separador: coma (,) o punto y coma (;)</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileInput} />
          </div>
        </div>
      )}

      {/* ── STEP 2: MAPEO ─────────────────────────────────────────────────── */}
      {step === 'mapeo' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-oriental-black">Mapear columnas del CSV</p>
                <p className="text-xs text-oriental-gray mt-0.5">
                  Se detectaron <strong>{csvHeaders.length}</strong> columnas y <strong>{csvRows.length}</strong> filas de datos
                </p>
              </div>
              <button onClick={resetAll} className="flex items-center gap-1.5 text-xs text-oriental-gray hover:text-oriental-black">
                <RefreshCw size={13} /> Cambiar archivo
              </button>
            </div>

            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.key} className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${f.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                      {f.required ? 'REQ' : 'OPC'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-oriental-black">{f.label}</p>
                      <p className="text-[11px] text-oriental-gray">{f.hint}</p>
                    </div>
                  </div>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className={`select text-sm ${mapping[f.key] ? 'border-green-400 bg-green-50' : f.required ? 'border-red-300' : ''}`}
                  >
                    <option value="">— No mapear —</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview de las primeras 2 filas del CSV */}
            {csvRows.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs font-bold text-oriental-gray uppercase tracking-wider mb-2">Vista previa del archivo (primeras 2 filas)</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {csvHeaders.map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-oriental-gray whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 2).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          {csvHeaders.map(h => (
                            <td key={h} className="px-3 py-2 text-oriental-black whitespace-nowrap max-w-[150px] truncate">{row[h] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={resetAll} className="btn-secondary px-6">
              Atrás
            </button>
            <button onClick={goToPreview} className="btn-primary px-8 flex items-center gap-2">
              Previsualizar datos <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW ───────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-black text-oriental-black">{validations.length}</p>
              <p className="text-xs text-oriental-gray mt-1">Filas totales</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-black text-green-600">{filasValidas}</p>
              <p className="text-xs text-oriental-gray mt-1">Listas para importar</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-black text-red-600">{filasConError}</p>
              <p className="text-xs text-oriental-gray mt-1">Con errores (se omitirán)</p>
            </div>
          </div>

          {filasValidas === 0 && (
            <div className="card p-5 flex items-center gap-3 bg-red-50 border-red-200">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 font-medium">No hay filas válidas para importar. Revisa el mapeo de columnas.</p>
            </div>
          )}

          {/* Tabla de preview */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-oriental-black text-sm">Previsualización de datos</p>
              <p className="text-xs text-oriental-gray">{validations.length} filas · mostrando todas</p>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="text-xs w-full">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-oriental-gray w-12">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-oriental-gray w-20">Estado</th>
                    {fields.filter(f => mapping[f.key]).map(f => (
                      <th key={f.key} className="px-3 py-2.5 text-left font-semibold text-oriental-gray whitespace-nowrap">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validations.map((v) => (
                    <tr key={v.idx} className={`border-b border-gray-100 last:border-0 ${v.errors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2 text-oriental-gray font-mono">{v.idx + 2}</td>
                      <td className="px-3 py-2">
                        {v.errors.length === 0 ? (
                          <span className="flex items-center gap-1 text-green-700 font-semibold">
                            <Check size={12} /> OK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-semibold" title={v.errors.join('\n')}>
                            <X size={12} /> Error
                          </span>
                        )}
                      </td>
                      {fields.filter(f => mapping[f.key]).map(f => (
                        <td key={f.key} className={`px-3 py-2 whitespace-nowrap max-w-[180px] truncate ${
                          v.errors.some(e => e.includes(f.label)) ? 'text-red-600 font-semibold' : 'text-oriental-black'
                        }`}>
                          {v.mapped[f.key] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Errores detallados */}
          {filasConError > 0 && (
            <div className="card p-4">
              <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                <AlertTriangle size={15} /> Filas con errores (no se importarán)
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {validations.filter(v => v.errors.length > 0).map(v => (
                  <div key={v.idx} className="text-xs bg-red-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-red-800">Fila {v.idx + 2}:</span>
                    <span className="text-red-600 ml-2">{v.errors.join(' · ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('mapeo')} className="btn-secondary px-6">
              Atrás
            </button>
            <button
              onClick={handleImport}
              disabled={loading || filasValidas === 0}
              className="btn-primary px-8 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><RefreshCw size={16} className="animate-spin" /> Importando...</>
              ) : (
                <><Check size={16} /> Importar {filasValidas} {tab === 'clientes' ? 'cliente' : 'vehículo'}{filasValidas !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: RESULTADO ─────────────────────────────────────────────── */}
      {step === 'resultado' && resultado && (
        <div className="space-y-4">
          {/* Banner resultado */}
          <div className={`card p-6 flex items-center gap-4 ${resultado.ok > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${resultado.ok > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
              {resultado.ok > 0 ? <Check size={24} className="text-white" /> : <X size={24} className="text-white" />}
            </div>
            <div>
              <p className="font-bold text-oriental-black text-lg">
                {resultado.ok > 0
                  ? `¡${resultado.ok} ${tab === 'clientes' ? 'cliente' : 'vehículo'}${resultado.ok !== 1 ? 's' : ''} importado${resultado.ok !== 1 ? 's' : ''} exitosamente!`
                  : 'No se pudo importar ningún registro'}
              </p>
              {resultado.errores > 0 && (
                <p className="text-sm text-red-700 mt-1">{resultado.errores} fila{resultado.errores !== 1 ? 's' : ''} con error</p>
              )}
            </div>
          </div>

          {/* Detalles de errores */}
          {resultado.detalles.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={15} /> Errores durante la importación
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {resultado.detalles.map((d, i) => (
                  <p key={i} className="text-xs bg-red-50 rounded-lg px-3 py-2 text-red-700">{d}</p>
                ))}
              </div>
            </div>
          )}

          {/* Acciones post-importación */}
          <div className="flex gap-3">
            <button
              onClick={resetAll}
              className="btn-secondary px-6 flex items-center gap-2"
            >
              <Upload size={15} /> Nueva importación
            </button>
            <Link
              href={tab === 'clientes' ? '/clientes' : '/vehiculos'}
              className="btn-primary px-6 flex items-center gap-2"
            >
              <Check size={15} /> Ver {tab === 'clientes' ? 'clientes' : 'vehículos'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
