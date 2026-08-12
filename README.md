# JETPLUS

Sistema web de control de ingresos, egresos, recibos y cuotas para **JETPLUS** — Porlamar, Nueva Esparta.

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Correos:** Resend (dominio `navigroup.co`)
- **Deploy:** Vercel

## Setup local

```bash
# 1. Clonar el repo
git clone https://github.com/davidcedenobrit-rgb/jetplus.git
cd jetplus

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus keys de Supabase y Resend

# 4. Generar tipos de Supabase (opcional, ya incluidos)
npm run types

# 5. Correr en desarrollo
npm run dev
```

## Supabase

- **Project ID:** `miqjkqdyccvdbmlxyjfw`
- **URL:** `https://miqjkqdyccvdbmlxyjfw.supabase.co`

Las migraciones ya están aplicadas en producción. Si necesitas recrear el schema:

```bash
# Requiere Supabase CLI
supabase db push
```

## Módulos

| Módulo | Descripción |
|--------|-------------|
| `/dashboard` | Resumen ejecutivo con KPIs |
| `/clientes` | Gestión de clientes |
| `/vehiculos` | Gestión de vehículos por placa |
| `/ingresos` | Registro y aprobación de pagos |
| `/egresos` | Registro y aprobación de gastos |
| `/creditos` | Planes de crédito y cuotas |
| `/reportes` | Balance financiero y estadísticas |

## Numeración de documentos

- Recibos: `JPLUS-REC-2026-000001`
- Egresos: `JPLUS-EGR-2026-000001`

## Federación entre sedes

Este código base es compartido con otras sedes del grupo (La Oriental, Ki Auto,
Autosurca, Capital Motors), pero **Jetplus es un cliente independiente sin
relación con Grupo Oriente**. El panel central y la sincronización entre
concesionarios (`PANEL_MATRIZ`, `CONCESIONARIO_*_URL`, `CONCESIONARIO_*_SERVICE_KEY`)
deben permanecer **sin configurar** en este despliegue para que esas funciones
queden inertes.

---

Desarrollado por **Navi Group** · davidcedenobrit@gmail.com
