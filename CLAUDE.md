# JETPLUS — CLAUDE.md

## Proyecto
Sistema de gestión financiera para JETPLUS.
Cliente confidencial — no mencionar IA ni herramientas internas en entregables.

## Seguridad — OBLIGATORIO
Este proyecto maneja datos financieros sensibles.
Aplica SIEMPRE las reglas de:
~/.claude/skills/seguridad/SKILL.md

Prioridad máxima en:
- Autenticación y roles de usuario
- Validación de todos los inputs numéricos y montos
- Logs de auditoría de transacciones (sin datos sensibles)
- Rate limiting en endpoints de reportes y pagos

## Stack del proyecto
- Consultar el código existente antes de asumir tecnologías
- Mantener consistencia con lo que ya está implementado

## Contexto de negocio
- JETPLUS — RIF J-50372874-4, Av. Rómulo Gallegos, Porlamar, Nueva Esparta
- Vende principalmente vehículos MG y MAXUS
- Moneda principal: USD y VES

## Federación entre sedes — NO ACTIVAR
Este código base es compartido con otras sedes del grupo (La Oriental, Ki Auto,
Autosurca, Capital Motors). Jetplus es un cliente independiente, sin relación
con Grupo Oriente. Las variables `PANEL_MATRIZ` y `CONCESIONARIO_*_URL` /
`CONCESIONARIO_*_SERVICE_KEY` deben permanecer sin configurar en este
despliegue (ver `src/lib/cotizacion-federada.ts` y
`src/lib/concesionarios-externos.ts`), para que el panel central y la
sincronización entre concesionarios queden inertes.

## PDFs — REGLA OBLIGATORIA
TODOS los PDF que genere el centro de mando deben llevar el membrete/diseño TOP
de JETPLUS (logo, sello, datos legales y colores).
- Usar el membrete compartido `src/lib/pdf-membrete.tsx` y la identidad de
  `getConcesionarioIdentity` (logo, sello, nombre, RIF, dirección, colores).
- Colores por defecto: rojo #C41E3A + negro #111827.
