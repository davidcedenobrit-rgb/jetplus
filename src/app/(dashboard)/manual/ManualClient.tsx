'use client'

import { useState } from 'react'
import { ChevronDown, ShoppingBag, Users, Globe, Handshake, Share2, CalendarClock, ClipboardList, ScrollText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Modulo {
  id: string
  icon: LucideIcon
  titulo: string
  queEs: string
  pasos: string[]
  beneficio: string
}

const MODULOS: Modulo[] = [
  {
    id: 'ventas',
    icon: ShoppingBag,
    titulo: 'Ventas',
    queEs: 'El tablero principal: desde aquí se generan cotizaciones, se revisan proformas, se registran ventas y se ve todo lo vendido.',
    pasos: [
      'Generar cotización: arma el precio y las cuotas de un vehículo para un cliente.',
      'Cotizaciones / Proformas: seguimiento de lo cotizado hasta que se convierte en una proforma formal.',
      '"Registrar venta": procesa la venta completa — crea el vehículo, los ingresos, el crédito y las cuotas correspondientes.',
      '"⚡ Registro rápido": deja constancia de que un carro se vendió (cliente, precio, vehículo) sin generar automáticamente ingresos ni créditos — para anotar la venta al momento y completar la parte contable después.',
      '"🛡 Registrar venta AC500": igual al registro completo, pero para ventas bajo el plan Asegúrate $500.',
      'Ventas registradas: lista de todo lo vendido, con su etapa (inicial pendiente, crédito activo, entregado, etc.) y quién es la vendedora.',
    ],
    beneficio: 'Todo el proceso de venta —desde la cotización hasta el crédito— queda en un solo lugar, sin depender de hojas de cálculo o WhatsApp para llevar la cuenta.',
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    icon: Users,
    queEs: 'Base de datos de todos los clientes: naturales y jurídicos, con sus datos de contacto y vehículos comprados.',
    pasos: [
      'Buscar por nombre o cédula/RIF.',
      'Ver la ficha completa de un cliente: datos, vehículos, histórico de cotizaciones.',
      'Editar datos o marcar un cliente como inactivo.',
    ],
    beneficio: 'Un cliente no se "pierde" entre vendedores — su historial completo queda a un clic de distancia para cualquiera del equipo autorizado.',
  },
  {
    id: 'link-ventas',
    titulo: 'Link de Ventas',
    icon: Globe,
    queEs: 'El panel administrativo detrás del link público de vendedores (/ventas): configura vehículos, precios, planes y códigos de vendedoras.',
    pasos: [
      'Editar el catálogo de vehículos que se muestra en el link público.',
      'Configurar el Plan Asegúrate $500 (cronogramas, colores, disponibilidad).',
      'Crear y administrar los códigos de acceso de cada vendedora.',
    ],
    beneficio: 'Cambiar un precio o activar/desactivar un vehículo se hace desde aquí, y se refleja al instante en el link que usan las vendedoras con los clientes.',
  },
  {
    id: 'aliados',
    titulo: 'Aliados',
    icon: Handshake,
    queEs: 'Gestión de los aliados externos (inmobiliarias, corredores de seguros) que refieren clientes al concesionario a cambio de nada más que la relación comercial — cada uno entra con su propio código a /aliados.',
    pasos: [
      '"Aliados": crear un código nuevo (nombre + sector + código de 4 caracteres) y activar/desactivar los que ya existen.',
      '"Bitácora de aliados": ver todos los clientes que cada aliado ha enviado al concesionario, con fecha, vehículo de interés y si el cliente tiene inicial disponible.',
      'El mapa de calor muestra qué vehículos generan más interés entre los clientes que traen los aliados.',
      'Exportar todo a Excel o PDF con el botón correspondiente.',
    ],
    beneficio: 'Se puede medir qué aliado realmente está trayendo clientes (y cuáles no), sin depender de que alguien se acuerde de avisar por WhatsApp.',
  },
  {
    id: 'redes',
    titulo: 'Redes',
    icon: Share2,
    queEs: 'Bitácora de todo lo que pasa en el link público para redes sociales (/redes) — el que no necesita código y se comparte en Instagram, TikTok, etc.',
    pasos: [
      'El mapa de calor muestra qué vehículos elige más la gente que entra desde redes.',
      'La tabla de abajo lista cada cliente que llenó el formulario y mandó sus datos por WhatsApp, con la red de la que vino.',
      'Exportar a Excel o PDF.',
    ],
    beneficio: 'Permite saber si vale la pena seguir invirtiendo en una red social específica, en vez de adivinar por el número de "me gusta".',
  },
  {
    id: 'citas',
    titulo: 'Citas taller',
    icon: CalendarClock,
    queEs: 'Las citas que los clientes agendan solos desde el link público /citas para llevar su carro al taller.',
    pasos: [
      'El cliente elige un día (lunes a viernes) en un calendario y un horario libre de 1.5 horas entre 7:00am y 5:00pm.',
      'El sistema bloquea ese horario automáticamente — nadie más puede agendar la misma hora ese día.',
      'Al cliente le llega un correo de confirmación, y a Jetplus le llega un WhatsApp con sus datos.',
      'Aquí en el panel se ve la lista de citas agrupadas por día, con acceso directo a WhatsApp del cliente.',
      'Exportar a Excel o PDF.',
    ],
    beneficio: 'El taller deja de coordinar citas por teléfono una por una, y nunca se cruzan dos citas en el mismo horario.',
  },
  {
    id: 'historial',
    titulo: 'Historial de clientes',
    icon: ClipboardList,
    queEs: 'Vista rápida del historial de interacciones y compras de los clientes ya registrados.',
    pasos: ['Buscar un cliente y revisar su histórico completo en un solo lugar.'],
    beneficio: 'Da contexto inmediato antes de atender a un cliente que ya compró antes.',
  },
  {
    id: 'logs',
    titulo: 'Logs del sistema',
    icon: ScrollText,
    queEs: 'El changelog de la plataforma: cada mejora, corrección o función nueva que se agrega queda anotada aquí, con su beneficio explicado en palabras simples.',
    pasos: ['Revisar de vez en cuando para enterarse de qué cambió y por qué, sin tener que preguntar.'],
    beneficio: 'Transparencia sobre qué se ha hecho al sistema y para qué sirve cada cambio.',
  },
]

export default function ManualClient() {
  const [abierto, setAbierto] = useState<string | null>(MODULOS[0].id)

  return (
    <div className="space-y-2">
      {MODULOS.map(m => {
        const Icon = m.icon
        const isOpen = abierto === m.id
        return (
          <div key={m.id} className="card overflow-hidden">
            <button onClick={() => setAbierto(isOpen ? null : m.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-oriental-red" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-oriental-black text-sm">{m.titulo}</p>
                <p className="text-xs text-oriental-gray mt-0.5 truncate">{m.queEs}</p>
              </div>
              <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-3">{m.queEs}</p>

                <p className="text-[11px] font-bold text-oriental-gray uppercase tracking-wider mb-1.5">Cómo funciona</p>
                <ul className="space-y-1.5 mb-3">
                  {m.pasos.map((p, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-oriental-red font-bold shrink-0">{i + 1}.</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-[11px] font-bold text-green-800 uppercase tracking-wider mb-1">Beneficio</p>
                  <p className="text-sm text-green-900">{m.beneficio}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
