# Informe final de auditoría documental y plan de corrección

## Objetivo

Revisar la documentación del proyecto para detectar incoherencias entre el plan de desarrollo y el estado real del repositorio, y proponer un modelo de documentación claro, mantenible y consistente.

## Resumen ejecutivo

La documentación del proyecto tiene una base sólida, pero presenta dos problemas principales:

1. Mezcla documentos vivos (roadmap, README, decisiones arquitectónicas) con documentos históricos o de referencia.
2. La narrativa del estado actual del proyecto no está sincronizada con la implementación real y con la fase actual del roadmap.

Como consecuencia, distintos documentos de la misma arquitectura están describiendo el proyecto desde perspectivas ligeramente distintas, lo que puede generar decisiones contradictorias en fases posteriores.

## Hallazgos

### 1. Inconsistencia entre README y roadmap

El README describe un estado inicial del proyecto y un entregable base, pero más adelante vuelve a describir la estructura completa del módulo como si ya estuviera parcialmente implementada. El roadmap, por su parte, marca la fuente de verdad del plan y del criterio de salida.

Esto genera ambigüedad sobre si el proyecto está:

- en fase de configuración inicial,
- en implementación de dominio,
- o ya en fases avanzadas con entregas reales.

### 2. Mezcla de documentos vigentes y documentos históricos

El repositorio incluye referencias a documentos antiguos que fueron resueltos, pero no existe una frontera clara entre:

- documentación activa,
- documentación de decisión,
- documentación de contexto histórico,
- y documentación técnica de referencia.

La práctica correcta es que cada tipo de documento tenga un rol distinto y una regla de actualización distinta.

## Recomendación de modelo documental

Se recomienda adoptar la siguiente estructura de verdad:

1. [ROADMAP.md](../ROADMAP.md)

- es la fuente de verdad del plan y de los criterios de salida.
- define qué se entrega por fase.

2. [README.md](../README.md)

- es la vista general del proyecto.
- debe describir el propósito, la composición del sistema y el estado actual de forma breve.

4. Documentos históricos

- quedan como referencia, pero no deben formar parte de la narrativa operativa.
- deben estar claramente identificados como legacy o superseded.

## Correcciones propuestas

### A. Separar claramente responsabilidad documental

- README: “qué es el proyecto” + “estado actual” + “cómo entrar al repositorio”.
- ROADMAP: “qué se entregará y en qué orden”.
- Historicos: “qué se descartó o qué dejó de ser válido”.

### B. Añadir una matriz de fase

Cada fase debería tener:

- objetivo
- estado
- evidencia
- bloqueadores
- siguiente paso

Esto reduce ambigüedad y permite al equipo tomar decisiones con una sola referencia.

### D. Actualizar el README con una sección de estado unificada

La sección de estado del README debería decir claramente si el proyecto está:

- en preparación,
- en fase 1,
- en desarrollo parcial,
- o validado.

Esto debe basarse en evidencia real: compile, tests, coverage y build.

## Recomendaciones de limpieza

### Archivos innecesarios en esta fase

Los siguientes tipos de archivos no aportan valor si se mantienen mezclados con la documentación principal:

- documentación histórica duplicada,
- borradores de planes reemplazados,
- carpetas vacías de placeholders,
- documentos de decisión sin estado formal o sin índice.

### Renombrado sugerido

Si se quiere mejorar la legibilidad del repositorio, conviene mantener una convención narrativa:

- `00-auditoria-documentacion.md`
- `01-roadmap.md`
- `02-adr-index.md`
- `03-estado-del-proyecto.md`

Esto hace que la documentación principal sea más fácil de encontrar y de entender.

## Decisión recomendada

Se recomienda:

1. mantener [ROADMAP.md](../ROADMAP.md) como único plan operativo,
2. mantener [README.md](../README.md) como vista general,
3. consolidar este informe como documento guía de coherencia documental,
4. eliminar o vaciar las carpetas placeholder que no aporten contenido real.

## Conclusión

El proyecto no tiene una contradicción técnica mayor en este momento, pero sí tiene una contradicción de gobierno documental: varias piezas de la documentación están describiendo el mismo proyecto con distinta intención y distinto nivel de autoridad.

La corrección más útil es formalizar una jerarquía de documentos y dejar una única fuente de verdad para cada tipo de decisión.
