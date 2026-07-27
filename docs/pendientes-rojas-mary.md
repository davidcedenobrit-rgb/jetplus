# Pendientes del sistema — Conversaciones con José Rojas y Mary

> Documento vivo. Se alimenta de las grabaciones/conversaciones de trabajo.
> **Fuente actual:** Grabación 1 (recorrido en oficina con Rojas y Mary, caso real: cotización #43 — Petro Soluciones).
> Prioridad: 🔴 alta · 🟡 media · 🟢 mejora / a futuro.

---

## 1. Cotización — Retenciones automáticas de IVA 🔴
*("estaba a punto de cargar las retenciones en automático")*

- [ ] Al marcar el cliente como **agente de retención**, calcular la retención **automáticamente** (hoy solo aparece una nota, no el cálculo).
- [ ] Agregar campo **"¿Es agente de retención?" (Sí/No)** y, si es Sí, **"% de retención"** (75 %, 95 %, 100 %). Hay clientes que retienen 100 % y otros 75 %.
- [ ] Fórmula: sobre el IVA se resta el % retenido.
  - 75 % → el cliente paga **base + 25 % del IVA** (retiene el 75 %).
  - 100 % → el cliente paga **solo la base** (retiene todo el IVA).
- [ ] Mostrar el **monto ya calculado** de lo que pagaría el cliente (no solo la nota). *"Si le da el cálculo de una vez, ya sabe cuánto tendría que pagar — eso es lo que le gusta al cliente."*
- [ ] Mantener la nota existente: *"Si el cliente es agente de retención, deberá presentar la retención al momento de ser facturado para que se le reconozca dicho porcentaje del IVA."*

## 2. Cotización — Editar cliente / persona jurídica 🔴

- [ ] Permitir **editar el nombre del cliente** en la cotización (ej. pasar de persona natural al nombre de la empresa a facturar).
- [ ] Corregir el selector **"Jurídico"**: hoy no deja seleccionarlo (*"no me da la opción para agarrar jurídico"*).
- [ ] Al ser jurídico, capturar **RIF con "J"** correctamente.
- [ ] Registrar **motivo de edición interna** al modificar el cliente (ya se vio el campo; confirmar que funciona).
- [ ] Nota de negocio (resuelto): se factura a la **empresa**; el representante legal va anexado en los documentos del cliente, no como campo aparte.

## 3. Flujo Cotización → Proforma (notificaciones) 🟡

- [ ] Confirmar el circuito completo:
  1. Vendedora crea cotización → cliente acepta (o ella marca **"Aceptada"**).
  2. Le llega notificación a **Rojas** de cotizaciones aceptadas para convertir en proforma.
  3. Si el cliente pide **descuento u otra condición** → botón *"Solicitar descuento / otra condición"* → notificación a Rojas → él revisa, modifica, **"Guardar y volver a enviar"** → regresa a la vendedora → ella reenvía al cliente.
- [ ] Al **solicitar proforma**, la bandeja de la vendedora **no debe permitir enviar** si faltan datos del cliente o documentos.
- [ ] La vendedora debe **anexar de una vez** los documentos del cliente (cédula, RIF, requisitos básicos) — cargar **una sola vez** para que Administración no los ande pidiendo.

## 4. Crédito de la inicial de La Oriental (en la proforma) 🔴

- [ ] Al convertir en proforma, si hay condiciones especiales, preguntar: **"¿Tendrá crédito de la inicial por La Oriental?"** →
  - N° de cuotas / meses.
  - **Tasa de interés** (ej. ~18 % anual) — hoy el texto está escrito pero **no se calcula**.
- [ ] Ese financiamiento debe **calcularse y aparecer** como bloque propio, separado del crédito de Vehimotor.
- [ ] En el documento deben verse **dos créditos**: (a) crédito de la inicial (La Oriental) y (b) crédito Vehimotor.

## 5. Rediseño de la Proforma 🔴
*(la proforma es el "puente" para que la vendedora registre la venta)*

- [ ] La proforma debe mostrar: datos del cliente, **resumen de la operación** (igual que la cotización), **tarjeta con los datos del vehículo** (del showroom, con placa) y el **cuadrito de condiciones**.
- [ ] La proforma **llega hasta las condiciones** (condiciones aceptadas + condiciones de pago acordadas + tarjeta del vehículo). **No** debe mostrar el detalle/cronograma interno del plan.
- [ ] **Quitar de la proforma el cuadro de deuda interna** del cliente (crédito inicial + Vehimotor). *"Ese cuadro es de nosotros, es interno, no se le pasa al cliente ni a Vehimotor."*
- [ ] La proforma debe traer el **número de cotización relacionado** y el **nombre de la vendedora**.

## 6. Documento post-venta ("Documento de venta" / resumen) 🔴

- [ ] Al **registrar la venta**, generar un **documento nuevo** (resumen de venta), con el mismo formato del documento de venta actual (ej. el de junio, caso Jonathan).
- [ ] Contenido: datos del cliente, **datos del carro (placa, VIN, motor)**, notas adicionales, firma, y **compromisos de pago**.
- [ ] Mostrar el financiamiento **como aparece en Créditos**.
- [ ] Bloques separados: **"Compromiso de pago — Financiamiento La Oriental"** y **"Compromiso de pago — Financiamiento Vehimotor"**.
- [ ] Definir el **nombre** del documento.

## 7. Registro de venta 🟡

- [ ] Notificación a Administración (Mary / Carla) cuando Rojas convierte en proforma: **"hay una venta por registrar"**.
- [ ] Bandeja **"Proformas pendientes por registrar"** para Administración.
- [ ] Al registrar, **seleccionar el carro del showroom** trae todos sus datos (VIN, motor, placa) — ✅ funciona; confirmar.
- [ ] **Vincular a showroom:** ordenar/filtrar para que aparezca primero el modelo relevante (si es T60, primero las T60; si es MG3, primero los MG3).
- [ ] **Cliente registrado desde cotización** debe quedar automáticamente en la **base de datos de clientes** (buscable). Hoy parece que no. *"Si registro un cliente de una cotización, ya debería meterse en la base de datos."*
- [ ] Al convertir a proforma / registrar, hacer **obligatorio** completar todos los datos del cliente.

## 8. Etiquetas de expediente 🟡

- [ ] **Etiqueta de cliente**: corregir tamaño — *"quedó muy pequeña"*.
- [ ] **Etiqueta de vehículo**: probar y ajustar.

## 9. Registro de ingreso (inicial / pagos) 🔴

- [ ] Al registrar la venta, activar **acuerdo de pago** + **registro de ingreso inicial**; el ingreso inicial queda **anexado al acuerdo de pago**.
- [ ] Campos: método (efectivo / transferencia), moneda (Bs / $), banco receptor, N° de referencia, recibo manual, foto/comprobante.
- [ ] **Conversión automática Bs → USD**: mostrar un **resumen** con el equivalente en dólares de cualquier monto en bolívares, usando la tasa. *"Todo lo que lleve bolívares, expresarlo también en dólares."*
- [ ] Agregar **Centro de Costo** al ingreso (*"aquí falta como el centro de costo"*).
- [ ] Concepto del ingreso debe diferenciar **inicial vs IVA**. El **IVA del carro/moto no es ingreso nuestro** → no entra al centro de costo (es de carro y moto).
- [ ] **Recalificación de ingreso** (Mary puede reclasificar a qué parte va cada monto) — confirmar que funciona.

## 10. Canal de destino / Custodio (aprobación de ingresos) 🔴

- [ ] Bug: en **"Aprobar ingreso"**, el campo **"Custodio / ¿quién lo tiene ahora?"** no se autollena con los nombres del **canal de destino** de arriba. Debe reflejar los mismos (ej. Carla, Ledy, Omar).
- [ ] Faltan custodios en la lista: **agregar Panamá** (y revisar la lista completa de custodios/canales).
- [ ] Tras aprobar → reportar a **Carla** → Carla **confirma recepción** desde su teléfono → luego **"Enviar a depositar"** y reportar a Vehimotor.

## 11. App / PWA para custodios (Carla, etc.) 🔴
*("hay que crear la aplicación urgente")*

- [ ] Convertir el link en **app instalable (PWA "Agregar a pantalla de inicio")** para que Carla la use en su teléfono.
- [ ] Que funcione la instalación en **iPhone/Safari** (hoy dio problemas; en Chrome/Android es otro flujo).
- [ ] Desde la app: **confirmar recepción**, ver su **centro de mando**, y **enviar a depositar**.
- [ ] Preparar teléfono nuevo para Carla e instalárselo.

## 12. Reportar a Vehimotor 🔴
*(flujo por consolidar)*

- [ ] Terminar el flujo **"Reportar a Vehimotor"**: definir **cómo se envía el correo y a quién** (pedir correo del destinatario).
- [ ] **Bug crítico de moneda**: evita que reporte montos en **Bs como si fueran USD** (*"iba a reportar 3 millones de dólares y no lo son"*).
- [ ] **Separar deuda interna vs deuda Vehimotor:** a Vehimotor solo se reporta **su crédito**, nunca el crédito interno de la inicial de La Oriental. Al cliente se le explica que la inicial es crédito interno de La Oriental y lo otro es el plan de Vehimotor.
- [ ] Nadie (ni Rojas) puede ejecutar lo que solo corresponde al usuario responsable; toda manipulación queda visible.

## 12b. Auditoría / Changelog 🟢

- [ ] Confirmar **registro de auditoría** (quién escribe, mueve o modifica cada cosa) y que sea consultable.
- [ ] Vista de **actualizaciones de desarrollo** (changelog) con el beneficio de cada cambio.

## 13. Módulo Contable/Financiero (con Neida, la contadora) 🔴

- [ ] **Reunión con Neida** para diseñar el módulo **a la medida de cómo ella trabaja** (no rehacer después).
- [ ] Diseñar el front del **Estado Financiero / Estado de Resultado** para que ella genere los informes más rápido: **plantilla → ella carga datos → imprime en papel de seguridad → firma y sella**.
- [ ] El módulo se **auto-alimenta en tiempo real** de la data operativa (ingresos, egresos, ventas, repuestos).
- [ ] Todo articulado por **Centro de Costo** → estado de resultado por centro de costo.
- [ ] Revisar con **Mary** cuáles archivos (Excel / soportes físicos) le pasa hoy a Neida, para automatizar esa entrega.

## 14. Centros de Costo (núcleo del sistema) 🔴

- [ ] Definir bien la estructura de **centros de costo** (es "el cerebro" que alimenta lo contable).
- [ ] Cada **factura (repuesto o gasto)** se asigna/divide por **centro de costo** al llegar.
- [ ] **Repuestos** → inventario + centro de costo.
- [ ] Ventas ya tiene su centro de costo y estado de resultado sencillo — ✅.

## 15. Repuestos 🟡

- [ ] **Compra en plaza:** registrar en **Bs y $**, con **cantidad**. (Ya señalado; hay ítems nuevos por corregir la moneda.)
- [ ] **Catálogo:** dejar que se llene con el tiempo; comparativa **catálogo vs compra en plaza** (ej. "punto manguera" $15).
- [ ] Desde la **cotización de repuesto → factura de compra**, generar **comprobante de retención** y **comprobante de pago**.
- [ ] Alimentar **libro de compra** y **libro de venta** desde la cotización de repuesto.

## 16. Documentos / Permisos gubernamentales de la empresa 🟡

- [ ] Módulo para todos los **permisos y documentos corporativos** (bomberos, alcaldía, etc.).
- [ ] Registrar **fecha de emisión / vencimiento**; al faltar **3 meses**, enviar **notificaciones cada 15 días**.
- [ ] Habilitarlo bajo **"Documentos de empresa / Corporativo"**; anexar el documento.
- [ ] Si un documento genera **fecha + pago**, registrarlo también ahí.
- [ ] Incluir **acta de asamblea** y **aumento de capital**.
- [ ] Revisar la **lista que Rojas pasó** para ver qué otros documentos faltan.

## 17. Integración Taller / Servicio (Vehimotors – Taller RP) 🟢

- [ ] Adaptar la data de **Taller RP**: exportar Excel de la **orden de servicio** y que el sistema lo **lea y cargue** los datos (sin copiar/pegar).
- [ ] A futuro: **agente automatizado** que, fuera de horario (ej. 7–8 pm), lea una orden de servicio creada fuera de hora, distribuya la información y deje una **tarea pendiente de revisión humana**.
- [ ] Enfoque actual: primero el **centro (finanzas/admin)**; lo externo (taller) se adapta después con el mismo lenguaje del sistema.

## 18. Filosofía transversal — cargar datos una sola vez 🟡

- [ ] **Ingresar cada dato una sola vez** y reutilizarlo en todos lados (cotización → proforma → venta → ingresos → créditos).
- [ ] Permitir **carga masiva de clientes** desde documentos (ej. Ari carga, otro verifica y guarda).

## 19. Documentos por automatizar (generar PDF desde el CDM) 🔴
> David pasará los **formatos que ya existen** para replicarlos con el membrete y estilo del sistema. Todos se generan por **selección simple** en el CDM y producen el PDF.

- [ ] **Formato de circulación personal.**
- [ ] **Formato de traslado en grúa.**
- [ ] **Formato de penalización de dinero:** cuando ya se aprobó la compra y el cliente pagó un monto (XXX) y **se quiere echar para atrás**, se le cobra una **penalización**. El formato debe reflejar el monto pagado, la penalización aplicada y el saldo a devolver/retener.
- [ ] **Formato de PDI (Ari)** — genera desde el CDM por selección simple → PDF.
- [ ] **Formato de PDI (taller)** — genera desde el CDM por selección simple → PDF.
- [ ] Estilo unificado: membrete por agencia + márgenes correctos (igual que el acuerdo de cobro / proforma).
- [ ] **Pendiente de David:** enviar los formatos actuales de cada uno para calcarlos.

*(Relacionado con los pendientes de Showroom #29–#30: proceso de chequeo de vehículo y PDI.)*

---

## Operativo / no-software (mencionado, para no perderlo)

- Comprar/llevar **impresora** para que las vendedoras impriman sus cotizaciones.
- **Hoja de ruta de la app**: certificados y pagos necesarios para publicarla.
- Showroom (acomodo físico): mover **RX9, RK8/RK9, B90** a la línea de entrada; sacar unidades llamativas al frente.
