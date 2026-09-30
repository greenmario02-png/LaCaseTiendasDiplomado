/**
 * Info de la última versión de la app móvil, consultada por el propio app al iniciar
 * (GET /api/app-version) para avisarle al usuario que hay una actualización disponible.
 * Editar `latestVersion`/`apkUrl`/`notes` en cada release y desplegar el backend — no requiere
 * tocar el store de Android (la APK se distribuye por fuera, no hay Play Store).
 *
 * `mandatory: true` bloquea el aviso (sin botón "Después") — usarlo solo si una versión vieja
 * ya no puede hablar con el backend (ej. un cambio de contrato de API incompatible).
 */
export const APP_VERSION_INFO = {
  latestVersion: '1.1.0',
  apkUrl: 'https://raw.githubusercontent.com/greenmario02-png/LaCaseTiendasDiplomado/feature/empleos-geo-rediseno/aplicacion/LaCaseMultitiendas.apk',
  mandatory: false,
  notes: 'Mejoras de rendimiento y corrección de errores. Recomendamos actualizar.',
};
