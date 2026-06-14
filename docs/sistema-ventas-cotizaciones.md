# La Oriental Automotors — Sistema de Ventas y Cotizaciones

---

## 1. Página pública de ventas (`/ventas`)

**Acceso:** Pública — cualquier persona con el link puede verla, sin login requerido.

**Actualización:** Automática cada 60 segundos.

**Contenido:** Muestra todos los vehículos marcados como **disponibles** en el catálogo, ordenados por prioridad definida por el administrador.

Cada tarjeta de vehículo incluye:
- Imagen, marca y modelo
- Precio base (contado)
- Estimado plan 40% inicial + cuota mensual
- Stock disponible, transmisión, año
- Botones: **WhatsApp**, **Compartir**, **Cotización Rápida**, **Cotización Formal**

---

## 2. Gestión de precios (Centro de Mando)

**Ruta:** `/link-ventas` → pestaña **Catálogo de vehículos**

Solo José Rojas tiene acceso. Por cada vehículo puede editar:

| Campo | Descripción |
|---|---|
| Precio Base | Precio de contado del vehículo |
| G. Contado | Gastos plan contado (póliza, traslado, INTT, notaría) |
| G. Crédito Vehimotors | Gastos plan crédito Vehimotors |
| Cuota 24m Vehimotors | Cuota mensual plan Vehimotors |
| Placa | Costo placa gobierno ($400 por defecto) |
| Gastos Banco | Gastos plan 100% Banco (sin diferencial) |
| Cuota Banco | Cuota mensual plan bancario |

**Pestaña Tasas:** Rojas actualiza diariamente la **Tasa BCV** y la **Tasa Vehimotors**, necesarias para calcular el diferencial cambiario del plan bancario.

---

## 3. Modalidades de cotización

### A. Cotización Rápida
- Sin código de vendedora
- Solo visible en pantalla (no guarda ni envía)
- Muestra precios estimados: plan contado y plan Vehimotors crédito

### B. Cotización Formal
- Requiere código de vendedora (ej: `D198`)
- Se registra en el sistema con número único
- Se genera PDF y se envía al correo del cliente
- José Rojas recibe notificación automática

---

## 4. Planes disponibles en cotización formal

### Contado
```
Total = Precio base + IVA (16%) + Gastos contado
```

### Crédito 24 meses — Plan Vehimotors
```
Inicial  = Precio base × 40% + IVA + Gastos crédito
Financ.  = Precio base × 60%
Cuota    = Valor manual por vehículo
```

### Crédito 24 meses — Plan 100% Banco
```
Total Vehículo = Precio base + IVA (16%) + Placa
Inicial        = Total Vehículo × 30%
Financiamiento = Total Vehículo × 70%
Diferencial    = Financiamiento × (Tasa VHM − Tasa BCV) / Tasa BCV
Gastos         = Gastos banco + Diferencial  ← el diferencial va incluido, no se muestra por separado
Total Inicial  = Inicial + Gastos
Cuota          = Valor manual por vehículo
```

> **Nota:** El diferencial cambiario nunca aparece desglosado en el PDF ni en ningún documento entregado al cliente. Se refleja dentro del renglón de Gastos.

---

## 5. Flujo completo de una venta

```
1. Cliente ve el link de ventas
2. Vendedora abre Cotización Rápida → muestra precios en el momento
3. Cliente interesado → Vendedora abre Cotización Formal
4. Ingresa código de vendedora + datos del cliente + modalidad/plan
5. Sistema genera PDF y lo envía al correo del cliente
6. José Rojas recibe notificación con resumen
7. Rojas confirma disponibilidad y procede con la venta
```

---

*Documento interno · La Oriental Automotors · Actualizado junio 2026*
