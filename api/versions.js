import { getAvailableVersions, DEFAULT_VERSION } from './versions/config.js';

export default async function handler(req, res) {
  try {
    const versions = getAvailableVersions();
    
    res.status(200).json({
      currentVersion: DEFAULT_VERSION,
      availableVersions: versions,
      timestamp: new Date().toISOString(),
      documentation: {
        usage: "Para usar una versión específica, agrega ?version=v1 o ?version=v2 a tu URL",
        example: "/api/elevenlabs?version=v1&startDate=2024-01-01"
      }
    });
    
  } catch (error) {
    console.error('Error al obtener información de versiones:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
} 