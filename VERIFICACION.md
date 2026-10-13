# Verificación de Brisa — 13 de octubre de 2026

## Ejecutado

- `npm test`: **16 pruebas pasan**, en tres archivos. Importes españoles, calculadora, fechas civiles, validación de versión, multiplicidades de Money Manager, conflictos de IDs propios, filtros inclusivos, tildes, totales, presupuestos por mes, base cero, años bisiestos, días de meses no consecutivos, bytes de adjuntos y CSV con protección de fórmulas y decimales españoles.
- Persistencia con simulación de localStorage y OPFS: escritura serializada, conflicto de pestaña antigua, recuperación desde documento anterior válido, error de cuota y error al cerrar una escritura sin perder el original.
- `npm run build`: TypeScript y Vite completados. Service worker generado con **204 recursos precacheados**, aproximadamente 5,6 MB: aplicación, worker PDF.js, mapas de caracteres, fuentes, WASM, perfiles de color e iconos locales. Vite advierte del tamaño del bundle; no es un error de compilación.
- Auditoría de dependencias de producción: **0 vulnerabilidades**. Auditoría completa después de actualizar PDF.js y Vitest: **0 vulnerabilidades**.
- Navegador integrado de Codex, versión de producción servida localmente: acceso con contraseña, cookie que conserva el acceso al abrir otra pestaña y recargar; cerrar sesión muestra nuevamente el acceso.
- Importación del archivo real desde Descargas: **360 válidos, 0 inválidos y 0 excluidos**. **319 gastos / 40.125,98 €**, **41 ingresos / 47.178,52 €**, balance **7.052,54 €**, fechas **2025-10-30 a 2026-10-12**, sin adjuntos. Archivo real no copiado al repositorio ni al bundle.
- Reimportación real: **360 coincidencias**; confirmar combinación mantiene **360 movimientos** y los mismos totales.
- Registro desde el día 13 del calendario. Operaciones `50 - 12,50 + 3 = 40,50` y `265 + 33 = 298`. Se conserva la expresión en el detalle.
- Incorporación de PNG y PDF ficticio de dos páginas; apertura, navegación entre recibos, cambio de página y zoom del PDF.
- Descarga del PDF: SHA-256 del original y descargado **idénticos**. Eliminación de una imagen adjunta conserva el movimiento y el PDF.
- Persistencia comprobada al abrir otra pestaña y tras recargar. Exportación completa JSON e importación en un **origen independiente** (localhost frente a 127.0.0.1), recuperando el recibo y su PDF de dos páginas. Es una prueba de almacenes separados dentro del mismo motor de navegador, no de dos productos distintos.
- Filtro por recibos reduce el informe al movimiento ficticio y permite descargar CSV.
- Prueba offline con el servidor Vite detenido: recargar Brisa, consultar movimientos, abrir PDF importado, editar cálculo, guardar y añadir una imagen local. Los movimientos ficticios se eliminaron después, dejando los 360 registros originales.
- Revisión visual de escritorio y móvil. Prueba real del layout en un **iframe de 360 × 800 px**: Inicio, calendario, formulario, informes y panel móvil de filtros. `clientWidth` y `scrollWidth` coinciden (345 px útiles más barra de desplazamiento), sin desbordamiento horizontal de la página. No equivale a probar un teléfono físico.

## Pendiente de verificar en dispositivos/navegadores reales

- Instalación y reinstalación en Android e iOS, safe areas, teclado virtual, cámara, orientación de fotos y presentación de notificaciones del sistema. No se ha probado un Android o iPhone físico.
- Elección/creación de archivos externos mediante los diálogos nativos de File System Access, revocación real de permisos y cuotas reales cercanas al límite. El código incluye estados y alternativas; la recuperación y los errores de escritura se probaron mediante simulaciones.
- Permiso y entrega efectiva de notificaciones del sistema en cada dispositivo. La tarjeta y vista previa se verificaron visualmente. **No hay push remoto con la app cerrada**: la aplicación es frontend sin servidor; el recordatorio se comprueba mientras está abierta. [Documentación de Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

## Entrega y privacidad

`CONTRASENA.txt` existe y está configurado localmente. La revisión automática rechazó publicarlo incluso después de la aprobación del usuario, por contener una credencial en texto plano. Se excluyó de Git; `CONTRASENA.example.txt` explica la configuración para otro checkout. Ni datos reales, recibos, capturas de pruebas ni copias JSON se publican en el repositorio.

La aplicación y `dist` están preparados para alojamiento estático HTTPS. Estas comprobaciones no afirman que se haya desplegado un sitio público ni que exista sincronización entre dispositivos.
