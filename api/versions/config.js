// Configuración de versiones de la API
export const API_VERSIONS = {
  v1: {
    name: 'v1',
    description: 'Versión estable que funcionaba originalmente',
    endpoint: '/api/versions/v1/elevenlabs',
    status: 'stable',
    deprecated: false
  },
  v2: {
    name: 'v2', 
    description: 'Versión en desarrollo con mejoras',
    endpoint: '/api/versions/v2/elevenlabs',
    status: 'development',
    deprecated: false
  }
};

// Versión por defecto
export const DEFAULT_VERSION = 'v1';

// Función para obtener la configuración de una versión
export function getVersionConfig(version) {
  return API_VERSIONS[version] || API_VERSIONS[DEFAULT_VERSION];
}

// Función para listar todas las versiones disponibles
export function getAvailableVersions() {
  return Object.keys(API_VERSIONS).map(key => ({
    version: key,
    ...API_VERSIONS[key]
  }));
} 