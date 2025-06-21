# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.0.0] - 2024-01-XX

### Agregado
- Sistema de versionado de API
- Endpoint principal que redirige a versiones específicas
- Configuración de versiones en `/api/versions/config.js`
- Script de gestión de versiones (`scripts/version-manager.js`)
- Documentación completa del sistema de versiones
- Endpoint `/api/versions` para obtener información de versiones

### Cambiado
- Refactorización del endpoint principal `/api/elevenlabs.js` para usar sistema de versiones
- Movimiento de la implementación original a `/api/versions/v1/elevenlabs.js`

### Estructura de Versiones
- **v1**: Versión estable (funcionaba originalmente)
- **v2**: Versión en desarrollo (preparada para futuras mejoras)

## [0.1.0] - 2024-01-XX

### Agregado
- Implementación inicial de la API de ElevenLabs
- Dashboard para visualizar estadísticas de llamadas
- Integración con Vercel KV para caché
- Endpoints para obtener historial de conversaciones

### Características
- Filtrado por fechas
- Caché de 5 minutos
- Métricas de llamadas por agente
- Duración total y promedio de llamadas 