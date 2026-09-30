# Entrega 3 · Checkpoint técnico

Material de apoyo para completar el Capítulo 2 (apartados 2.7 y 2.8) del documento del diplomado,
según el Módulo 4 (`P4_Pruebas_Despliegue_Defensa_Modulo4.pdf`, plenaria del 29/09/2026). Escrito
sobre el proyecto de 3 roles (`Monografia LaCase Multitiendas (3 Roles)`), desplegado en:

- Backend: <https://lacase-diplomado-api.onrender.com> (salud: `/api/v1/salud`)
- Frontend: <https://tiendaslacase.netlify.app>

## Contenido

- [`2.7-seguridad.md`](2.7-seguridad.md) — autenticación, autorización por rol, validación,
  cifrado y gestión de secretos, con referencia a archivo/línea del código real.
- [`2.8-pruebas.md`](2.8-pruebas.md) — plan de pruebas por nivel y tabla de 9 casos (CP-01 a
  CP-09), ejecutados el 30/09/2026 contra la URL pública, no contra localhost.
- [`capturas/`](capturas/) — 3 capturas fechadas en producción, referidas como figuras desde
  `2.8-pruebas.md`.

## Cómo se usa esto en el documento final

Cada archivo está escrito para copiarse casi literal al apartado correspondiente del Capítulo 2 del
documento del diplomado (el mismo archivo que ya tiene el Capítulo 1 y 2.1–2.6). Los códigos de
caso (CP-01…) y las figuras (Fig. 1…) siguen la numeración de los lineamientos (ID, escenario,
esperado, obtenido, estado) — si se agregan más casos en el documento final, renumerar para no
duplicar IDs.

## Pendiente para la Entrega 4

Ver la sección "Qué falta para la Entrega 4" al final de `2.8-pruebas.md`: correr la suite de Jest
completa con acceso interactivo, agregar un caso de rol `SELLER`, y verificar en producción la
corrección de CP-08 una vez que ese fix llegue a `main`.
