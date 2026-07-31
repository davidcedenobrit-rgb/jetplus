# Precompra (AC500) — Anexo A, correo y lógica de montos

Especificación de referencia (formatos entregados por dirección) para las fases 3–6
del módulo Precompra. No borrar: alimenta el generador de Anexo A y el envío por correo.

## Correo a Vehimotors (Marilyn)

**Asunto:**
`CICLO #<n> PLAN ASEGURATE CON 500/ <CLIENTE EN MAYÚSCULAS> - MODELO DEL VEHÍCULO <MODELO>`

**Cuerpo:**
```
Buenas tardes Marilyn,
En función de nota anexa ya conversado y aprobado por German, se requiere su apoyo
para solicitar contrato del siguiente ANEXO A

<contenido del ANEXO A>

Saludos
```
Se adjunta: comprobante de pago de la reserva del cliente + documentos del cliente
(cédula, RIF; si jurídica: registro mercantil + RIF empresa + cédula/RIF firmante;
si casado: cédula y RIF del cónyuge).

## ANEXO "A" — estructura (texto fijo en MAYÚSCULAS donde aplica)

```
ANEXO "A"
PRECIO DE VENTA CONDICIONES Y CRONOGRAMA DE PAGO

Señores;
CLIENTE:                 <nombre completo>
ESTADO CIVIL:            <estado civil>   (si CASADO: incluir datos del cónyuge + copia cédula y RIF)
CÉDULA DE IDENTIDAD:     <cédula>
RIF:                     <rif>
DIRECCIÓN:               <dirección completa como en RIF>
TELÉFONO:                <teléfono>
CORREO ELECTRÓNICO;      <correo>

A continuación, le presentamos un resumen de los acuerdos de nuestro plan de compra programada:

Fecha:                   <fecha inicio del plan / fecha del día>
Unidad:                  <modelo>
Color(es) de preferencia:<colores>
Gastos Asociados; IVA, IGTF y Gastos de Matriculación: $ <= cuota 6>
Nota: Estos Valores son estimados a esta fecha y están sujetos a variación, por orden o
datos suministrados por los entes Gubernamentales, los cuales se recotizarán al momento
de ejecutar el pago final)

Valor (Venta) de la unidad: $ <= Total − cuota 6  (= reserva + cuotas 1..5)>

Cronograma de pagos Convenido:
  Reserva:                 $ 500
  1, pago cuota 1:         $ <cuota 1>
  2, pago cuota 2:         $ <cuota 2>
  3, pago cuota 3:         $ <cuota 3>
  4, pago cuota 4:         $ <cuota 4>
  5, pago cuota 5:         $ <cuota 5>
  Al momento de la entrega del vehículo, pago cuota 6: $ <gastos> (incluye IVA, IGTF y gastos de matriculación)

Total a pagar:           $ <suma reserva..cuota 6>
```
Luego (versión Vehimotors) siguen las secciones fijas: Nota *1 (color referencial),
CONDICIONES DE GARANTÍA, ALCANCE DE LA GARANTÍA, "lo que no cubre" (11 puntos),
tabla de Tiempo y kilometraje por marca/serie, "Otros componentes con delimitación",
y firmas: `Por: <CLIENTE>  Firma`  /  `Por: VEHIMOTORS, C.A.  Firma`.

### Tabla de garantía (Tiempo y kilometraje por marca y serie)
| Marca | Cobertura |
|---|---|
| Maxus Series T, V, S, C, G | 3 años / 100.000 km |
| Maxus Series D | 5 años / 120.000 km |
| Maxus Series H, K | 2 años / 240.000 km |
| MG (VIN > 2025) | 6 años / 120.000 km |
| Baterías eléctricas / híbridas | 8 años / 150.000 km |

Serie del vehículo → auto-seleccionar la fila por modelo.

## DOS botones desde la proforma
1. **Anexo A Vehimotors** → `cuota 1 = cuota 1 base − $500`. (Es lo que se manda a Vehimotors; el
   membrete es de Vehimotors, C.A. — RIF J-50091794-5.)
2. **Anexo A Oriental** → montos idénticos a la proforma (cuota 1 CON los $500).
   Membrete La Oriental (según CLAUDE.md).

## Lógica de montos (verificada con el ejemplo)
Ejemplo María Solarte (T60 4X2, versión Vehimotors):
- Reserva 500; cuotas 1..5 = 5.314 / 4.845 / 4.845 / 2.907 / 969; cuota 6 (gastos) = 4.282
- Valor venta unidad = 500 + 5.314 + 4.845 + 4.845 + 2.907 + 969 = **19.380**  (= Total − cuota 6)
- Total a pagar = 19.380 + 4.282 = **23.662**
- La versión **Oriental** usa cuota 1 = 5.814 (= 5.314 + 500) → Total Oriental = 24.162 (los $500 los retiene La Oriental).

## Ciclos
- Anexos por ciclos mensuales (1–12). Al generar cotización/proforma, el sistema lee la
  fecha y determina/pregunta el ciclo; el número de ciclo va en el asunto del correo.

## Contable (Fase 6)
- Cada plan lleva **$500 (gastos administrativos)** + **% fijo por modelo** (≈ $1000 total gana La Oriental).
- Al pagar la cuota 1: **$500 → la bóveda** y **% del modelo → la división contable**.
- Sincerar en estado de resultados / plan situacional el ingreso real de La Oriental.

## Flujo del contrato (Marilyn)
1. Se genera proforma + Anexo A → se envía a Marilyn (correo con asunto de ciclo).
2. Desde el CDM: botón "Solicitar contrato" → correo a Marilyn con el mismo correlativo.
3. Marilyn sube el contrato (botón en su correo / enlace) → se recibe y guarda en el
   perfil del carro/crédito del cliente.
4. Se imprime, firma el cliente, y arranca la cobranza (pago de cuota 1).
- Opción de **firma digital** en tablet dentro del CDM (adjunta la firma al documento).
