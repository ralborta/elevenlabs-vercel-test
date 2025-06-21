# Sistema de Versionado de API

## Descripción
Este proyecto implementa un sistema de versionado para las APIs de ElevenLabs, permitiendo hacer rollouts seguros y mantener versiones estables mientras se desarrollan nuevas características.

## Estructura de Versiones

### Versión v1 (Estable)
- **Estado**: ✅ Estable
- **Endpoint**: `/api/versions/v1/elevenlabs`
- **Descripción**: Versión que funcionaba originalmente
- **Uso**: Recomendado para producción

### Versión v2 (Desarrollo)
- **Estado**: 🚧 En desarrollo
- **Endpoint**: `/api/versions/v2/elevenlabs`
- **Descripción**: Versión con mejoras y nuevas características
- **Uso**: Solo para testing

## Cómo Usar

### Endpoint Principal
```
GET /api/elevenlabs
```
Por defecto usa la versión v1 (estable).

### Especificar Versión
```
GET /api/elevenlabs?version=v1
GET /api/elevenlabs?version=v2
```

### Información de Versiones
```
GET /api/versions
```
Retorna información sobre todas las versiones disponibles.

## Workflow de Desarrollo

### 1. Desarrollo de Nueva Característica
1. Crear nueva versión en `/api/versions/vX/`
2. Implementar cambios en la nueva versión
3. Probar exhaustivamente

### 2. Rollout Gradual
1. Cambiar la versión por defecto en `config.js`
2. Monitorear métricas y errores
3. Si hay problemas, hacer rollback inmediato

### 3. Rollback
1. Cambiar `DEFAULT_VERSION` de vuelta a la versión estable
2. Investigar y corregir problemas en la nueva versión
3. Reintentar el rollout cuando esté listo

## Comandos Útiles

```bash
# Deploy a staging
npm run deploy:staging

# Deploy a producción
npm run deploy

# Ver información de versiones
curl https://tu-dominio.vercel.app/api/versions
```

## Mejores Prácticas

1. **Siempre mantener una versión estable**
2. **Probar nuevas versiones en staging primero**
3. **Documentar cambios entre versiones**
4. **Monitorear métricas después de cada rollout**
5. **Tener un plan de rollback preparado**

## Estructura de Archivos

```
api/
├── elevenlabs.js          # Router principal
├── versions.js            # Info de versiones
├── versions/
│   ├── config.js          # Configuración de versiones
│   ├── v1/
│   │   └── elevenlabs.js  # Versión estable
│   └── v2/
│       └── elevenlabs.js  # Versión en desarrollo
└── test-elevenlabs.js     # Endpoint de testing
``` 