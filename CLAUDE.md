# La Oriental Finanzas — CLAUDE.md

## Proyecto
Sistema de gestión financiera para La Oriental Automotors (MG & MAXUS).
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
- Con
@'
# La Oriental Finanzas — CLAUDE.md

## Proyecto
Sistema de gestión financiera para La Oriental Automotors (MG & MAXUS).
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
- Concesionario de vehículos MG y MAXUS en oriente de Venezuela
- Reportes dirigidos a director José Rojas
- Moneda principal: USD y VES

## PDFs — REGLA OBLIGATORIA
TODOS los PDF que genere el centro de mando deben llevar el membrete/diseño TOP
del concesionario de turno (logo, sello, datos legales y colores del concesionario).
- Usar el membrete compartido `src/lib/pdf-membrete.tsx` y la identidad de
  `getConcesionarioIdentity` (logo, sello, nombre, RIF, dirección, colores).
- Colores por defecto: rojo #C41E3A + negro #111827 (La Oriental). Cada
  concesionario puede sobreescribir color_primario/color_secundario.
- Ningún PDF nuevo o existente debe quedar sin membrete ni con colores fijos
  que no respeten al concesionario de turno.
