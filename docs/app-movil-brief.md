# Brief — App móvil del Centro de Mando La Oriental

> Documento de arranque para una **nueva sesión**. Contiene todo el contexto del
> sistema actual y los requisitos de la app móvil (Android + iOS). Cliente
> confidencial: no mencionar herramientas internas en entregables.

---

## 1. Objetivo
Llevar el **Centro de Mando La Oriental** (hoy web) a una **app móvil nativa**
para **Play Store** y **App Store**. Los certificados/cuentas de desarrollador
ya están pagados por Rojas (Google Play: pago único ~$25; Apple: ~$99/año).

La app debe:
- Reusar el **mismo backend Supabase** (no duplicar datos).
- Servir a **dos públicos**:
  1. **Staff/Directiva** (Rojas, Mary, Leysdem, vendedoras, taller): ver reportes,
     ventas, cobranza, tareas, aprobaciones y recibir **notificaciones push**.
  2. **Clientes** (rol `cliente`): ver su crédito, sus cuotas, fechas de pago y
     recibir **recordatorios de cobro** por push.
- Respetar la **línea gráfica** La Oriental y la **confidencialidad**.

---

## 2. Enfoque técnico recomendado
- **Expo (React Native) + expo-router** — cross-platform (iOS/Android), build con
  **EAS Build**, sin necesidad de Mac para compilar.
- **@supabase/supabase-js** (mismo backend; auth por email/clave, igual que la web).
- **expo-notifications** para push (tokens guardados en Supabase).
- **TypeScript**. Estilos con NativeWind (Tailwind RN) para reusar los tokens de color.
- Reusar la lógica de negocio de la web (cálculos de cuotas, división contable,
  retenciones) portando los helpers de `src/lib/`.

> Alternativa descartada: PWA envuelta. Como ya se pagaron los certificados de las
> tiendas, conviene app nativa con EAS.

---

## 3. Sistema actual (contexto)

### Repos (GitHub — owner `davidcedenobrit-rgb`)
- **Web (fuente de verdad del backend):** `davidcedenobrit-rgb/la-oriental-finanzas`
  (Next.js 15 App Router, React 19, Supabase, Tailwind 3, @react-pdf/renderer).
- **App móvil (nueva):** `davidcedenobrit-rgb/laoriental-app` (ya creado; vacío o base).

### Backend Supabase (2 bases, mismo esquema — multi-concesionario)
| Concesionario | Project ID | URL | Dominio web |
|---|---|---|---|
| **La Oriental** | `twrskadsskiiskrqdvaj` (sa-east-1) | https://twrskadsskiiskrqdvaj.supabase.co | centrodemando.laoriental.co |
| **Ki Auto** | `aleuxivmrdjwdzyyudne` (sa-east-1) | https://aleuxivmrdjwdzyyudne.supabase.co | centrodemandokiauto.laoriental.co |

- Auth: Supabase Auth (email + clave). El **rol** va en `user.app_metadata.rol`.
- Las migraciones se aplican **a AMBAS bases** (cada archivo lo indica).
- Claves: la **anon/publishable key** (pública, para el cliente móvil) se saca del
  dashboard de Supabase o vía MCP. **Nunca** poner el `service_role` en la app.

### Roles existentes (`app_metadata.rol`)
`jose`, `admin`, `director`, `mary`, `leysdem`, `arianna`, `almacen`, `taller`,
`cliente`.

### Módulos del sistema (secciones del menú)
- **Ventas y Clientes:** ventas, reporte de ventas (nueva/antigua, modalidad,
  vendedora, detalle), base de datos, clientes, vehículos, showroom, link de
  ventas, créditos, reporte de créditos, acuerdos de pago, historial.
- **Finanzas:** ingresos, egresos (con retención de **IVA** e **ISLR**), balance,
  estado de resultados (USD/Bs, vista La Oriental vs Vehimotors), flujo de caja,
  posición financiera, libro de IVA, cartera de cobranza, cobros por quincena
  (calendario), centros de costo (+ reparto de gastos comunes %), cuentas por
  pagar/cobrar, pago fijo, tasas, reportes, consolidados, proveedores,
  aprobaciones, anulaciones, efectivo/depósitos.
- **Inventario y Repuestos**, **Vehimotors** (custodia/terceros), **Corporativo**,
  **Sistema CDM** (tareas Kanban, eventos/calendario, concesionarios).

### Conceptos de negocio clave (para la app)
- **La Oriental ≠ Vehimotors:** el dinero de Vehimotors (financiamiento de carros
  en consignación y cuotas AC500) pasa por La Oriental en **custodia**; no es
  ingreso ni CxC de La Oriental. Reportes separan ambos.
- **Créditos:** planes `inicial_la_oriental`, `financiamiento_vehimotors`,
  `asegurate_500` (AC500), `cuota_especial`, `credito_40_60`. Cobranza usa
  `cuotas` (fecha_vencimiento, monto, monto_pagado, estado).
- **Centros de ingreso:** Ventas (comisiones), Ventas (servicio/taller), Venta de
  repuestos. Gastos comunes (fijos) se reparten por %.

### Línea gráfica / branding
- Colores: **rojo `#C41E3A`** + **negro `#111827`**. Cada concesionario puede
  sobreescribir color_primario/secundario (tabla `concesionarios`).
- Logo: `logo-la-oriental.png` · sello: `sello-la-oriental.jpeg` (en `/public` de la web).
- **Regla:** todo PDF/entregable lleva membrete del concesionario de turno.

### Confidencialidad (OBLIGATORIO)
- No mencionar IA ni herramientas internas en entregables ni en la app.
- Datos financieros sensibles → aplicar prácticas de seguridad (auth, validación
  de montos, RLS, rate limiting, logs de auditoría sin datos sensibles).

---

## 4. Alcance de la app (propuesta de fases)

### App Staff/Directiva (v1)
- Login (Supabase Auth) + selección de concesionario (La Oriental / Ki Auto).
- Dashboard: KPIs del mes (cobrado, egresos, por cobrar, efectivo en calle).
- Cobranza: cartera + calendario de cobros por quincena (a quién cobrar hoy).
- Ventas: reporte por tipo/modalidad/vendedora + detalle.
- Tareas (Kanban) y Eventos/cumpleaños.
- Aprobaciones (ingresos/egresos por aprobar) con push.
- Notificaciones push (mora, aprobaciones pendientes, cumpleaños, cobros del día).

### App Cliente (v2)
- Login del cliente (rol `cliente`).
- Ver su crédito: cuotas, montos, fechas, estado (al día / vencida).
- Recordatorios push de cobro (X días antes).
- (Futuro) Reportar pago / subir comprobante.

---

## 5. Backend pendiente para la app (Fase 0 — antes del móvil)
Aplicar en **ambas bases**:
1. **Rol `cliente`** con **RLS** que limite a cada cliente a ver **solo sus**
   créditos/cuotas (hoy casi todo el acceso es vía service role del lado web; para
   el móvil con anon key hace falta RLS por usuario para el rol cliente).
2. Tabla **`push_tokens`** (`user_id`, `expo_token`, `plataforma`, `updated_at`)
   + endpoint para registrar/actualizar el token al abrir la app.
3. Servicio de **envío de push** (Expo Push API) disparado por los crons ya
   existentes (mora, cumpleaños, cobros) — hoy avisan por correo/WhatsApp; agregar push.
4. Vincular cada `auth.user` de rol `cliente` con su registro en `clientes`
   (por cédula/RIF) para el RLS.

---

## 6. Publicación en tiendas (requisitos)
- **Cuentas de desarrollador:** Google Play Console (pago único) y Apple Developer
  (anual) — **ya pagadas por Rojas** (pedirle acceso/credenciales o que agregue al
  equipo).
- **Identidad de la app:**
  - Nombre: "Centro de Mando La Oriental" (definir nombre corto para el ícono).
  - Bundle ID iOS / applicationId Android: p. ej. `co.laoriental.centrodemando`.
  - Ícono (1024×1024), splash screen, colores del tema (rojo/negro).
- **Assets legales:** política de privacidad (URL), descripción, capturas por
  tamaño de pantalla, clasificación de contenido.
- **Build:** EAS Build (`eas build -p android/ios`) + `eas submit` a cada tienda.
- **Push:** credenciales FCM (Android) y APNs (Apple) configuradas en EAS/Expo.

---

## 7. Datos concretos para arrancar la nueva sesión
- Repo a usar: **`davidcedenobrit-rgb/laoriental-app`** (agregarlo a la sesión).
- Backend: reusar Supabase de arriba (URLs en la tabla). Sacar la **anon key** del
  dashboard de cada proyecto (o vía MCP `get_publishable_keys`).
- Reusar del repo web: helpers de `src/lib/` (cálculos), paleta de color, textos.
- Variables de entorno del móvil (Expo): `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (una config por concesionario).

## 8. Reglas para la nueva sesión
- Desarrollar en una rama, commitear y pushear (no tocar `main`/producción sin OK).
- Migraciones → **a las dos bases**.
- Confidencialidad y seguridad SIEMPRE (skill de seguridad).
- Mantener la línea gráfica La Oriental (rojo #C41E3A / negro #111827).

---

## 9. Primer prompt sugerido para la nueva sesión
> "Vamos a construir la app móvil del Centro de Mando La Oriental (Android + iOS)
> con Expo + Supabase, reusando el backend existente. Agrega el repo
> `davidcedenobrit-rgb/laoriental-app`. Empecemos por: (1) Fase 0 backend —
> rol `cliente` con RLS y tabla `push_tokens` en ambas bases; (2) scaffolding
> Expo (expo-router, NativeWind, supabase-js, expo-notifications) con login y
> selección de concesionario; (3) Dashboard staff con KPIs. Certificados de
> Play Store y App Store ya pagados. Mantén branding (rojo #C41E3A / negro) y
> confidencialidad."

---

## 10. Estado del sistema web al cerrar esta sesión
Rama `claude/compassionate-hawking-ITKVl` (migraciones ya aplicadas en producción):
- Fase 1: separar La Oriental/Vehimotors (Estado de Resultados + CxC). ✅
- Fase 2: centros de costo + gastos comunes por % + candado con clave de Rojas. ✅
- Retención de **ISLR** (10 conceptos, comprobante PDF). ✅ (aprobado por Rojas)
- Reportes en **bolívares** a tasa BCV; tasa de pago en egresos. ✅
- Recalificación de ingresos/egresos a centros. ✅
- Reporte de ventas (nueva/antigua + detalle) y año en cobros por quincena. ✅
- **Pendiente de Neyda:** Fase 4 (plan de cuentas + Estado de Situación) y Fase 5
  (libro de IVA formato oficial).
- **Pendiente merge a `main`** (todo vive en la rama).
