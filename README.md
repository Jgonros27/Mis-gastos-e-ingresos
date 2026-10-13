# Brisa · Gastos e ingresos

PWA frontend en español, React + TypeScript + Vite. No usa servidor, cuentas, IndexedDB ni servicios de datos externos. Los datos reales no forman parte del repositorio.

## Ejecutar y desplegar

Node 22.12+ o 24. Primero copiar `CONTRASENA.example.txt` a `CONTRASENA.txt` y poner la contraseña propia en la primera línea (el archivo local existente ya está configurado). `npm install`, `npm run dev`. Pruebas: `npm test`. Producción: `npm run build`, `npm run preview`. Publicar **todo** `dist` en alojamiento estático HTTPS; la base relativa permite subdirectorios. PDF.js y su worker se incluyen y precachean localmente. CONTRASENA.txt permanece local, excluido de Git.

Cambiar la primera línea de `CONTRASENA.txt` y recompilar para cambiar la contraseña. Se incluye solamente su SHA-256 en el bundle. Es un bloqueo básico frontend, evadible mediante inspección; no cifra el documento. Cookie de sesión sin caducidad, Path=/, SameSite=Lax y Secure en HTTPS. El navegador decide cuánto conserva la sesión.

## Datos y recibos

OPFS guarda un documento JSON y la versión anterior válida. Alternativa localStorage (4 MB conservadores por documento). Las escrituras están serializadas y usan Web Locks cuando existe; comprueban revisiones para no sobrescribir otra pestaña. Una escritura fallida conserva el estado pendiente y permite descargarlo. Solicitar persistencia no garantiza que el navegador no elimine datos. Borrar los datos del sitio puede borrar los movimientos. Mantener copias descargadas.

Exportar/importar JSON traslada todos los recibos entre dispositivos o entre pestaña y PWA con almacenamientos separados. No hay sincronización. File System Access permite seleccionar o crear archivo JSON y escribir una copia adicional con permiso; el vínculo no se conserva al cerrar. Reabrir el contenido de un archivo lleva a la revisión de importación antes de modificar datos. Reemplazar descarga la copia actual primero; combinar conserva IDs propios existentes, mostrando conflictos.

JPEG, PNG, WebP y PDF con comprobación de firma; límite ajustable en Ajustes (1–100 MB, inicial 10). No hay compresión. Todos los adjuntos están embebidos como base64. PDF.js admite páginas y zoom; los PDF cifrados o dañados conservan descarga. Las URL Blob se liberan al cerrar/cambiar el visor.

## Formato JSON (schemaVersion 1)

Documento: `schemaVersion`, `currency: "EUR"`, `revision`, `transactions`, `categories`, `budgets`, `settings`, `savedAt`.

Movimiento: `id`, `type: expense | income`, `amountCents` entero positivo, `date` civil YYYY-MM-DD, `categoryId`, `note`, `calculationExpression`, `attachments`, `createdAt`, `updatedAt`, `source` opcional (huella original para importaciones Money Manager).

Adjunto: `id`, `name`, `mime`, `size` en bytes, `addedAt`, `base64` completo sin prefijo data URL. Categoría: `id`, `name`, `type`, `icon`, `color`, `archived`. Presupuestos: mapa `default` o `YYYY-MM` → mapa de IDs de categoría o `global` → céntimos. Cero es un presupuesto explícito; ausencia significa no presupuestado. Las versiones futuras se rechazan explícitamente: no se migra de forma especulativa.

Money Manager preserva multiplicidades idénticas dentro del archivo; combinar descuenta solamente coincidencias del historial. Los tipos no admitidos se excluyen con contador y los registros inválidos se listan. Las referencias de pictures ausentes producen avisos; objetos base64/MIME válidos se incorporan.

## Recordatorio e instalación

El recordatorio muestra «No olvides agregar tus ingresos y gastos», con icono propio, vista previa y tarjeta dentro de Brisa. Con permiso, usa notificaciones del sistema y service worker. **Sin servidor no hay envío de Web Push remoto con la aplicación cerrada**: se comprueba cada 30 segundos mientras está abierta, una vez al día desde la hora elegida. La apariencia final depende del sistema operativo. Referencia: [Push API de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

Instalación programática cuando beforeinstallprompt está disponible; instrucciones para Safari iOS o menú de otros navegadores. La ausencia del evento no se interpreta como instalación. La actualización requiere acción explícita y no interrumpe un formulario abierto.

## Informes

Filtros combinados, favoritos, medias, evolución, distribuciones separadas por tipo, ranking, balance acumulado desde cero, resumen mensual, matriz y conceptos. CSV UTF-8 BOM con separador punto y coma, comillas escapadas y protección contra fórmulas. Impresión permite guardar PDF. Presets sustituyen rango y meses; filtros temporales manuales se intersectan. No disponer de movimientos no demuestra ausencia de gasto.

## Verificación

Consultar `VERIFICACION.md` para resultados ejecutados y limitaciones. Las pruebas unitarias usan exclusivamente datos ficticios. No se ha verificado un teléfono Android ni un iPhone físico.
