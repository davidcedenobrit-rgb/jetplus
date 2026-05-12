# La Oriental Finanzas

Sistema web de control de ingresos, egresos, recibos y cuotas para **La Oriental Automotors** — MG & MAXUS, Maturín.

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Correos:** Resend (`cotizaciones@laoriental.co`)
- **Deploy:** Vercel

## Setup local

```bash
# 1. Clonar el repo
git clone https://github.com/TU_USUARIO/la-oriental-finanzas.git
cd la-oriental-finanzas

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

- **Project ID:** `twrskadsskiiskrqdvaj`
- **URL:** `https://twrskadsskiiskrqdvaj.supabase.co`
- **Región:** São Paulo (sa-east-1)

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

## Roles

| Rol | Acceso |
|-----|--------|
| `jose` | Control total + aprobaciones |
| `mary` | Registro de ingresos y egresos |
| `leysdem` | Registro de ingresos y egresos |
| `carla` | Vista ejecutiva (reportes) |
| `admin` | Configuración del sistema |

## Numeración de documentos

- Recibos: `LOA-REC-2026-000001`
- Egresos: `LOA-EGR-2026-000001`

---

Desarrollado por **Navi Group** · davidcedenobrit@gmail.com
