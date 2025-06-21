// api/versions/v2/elevenlabs.js - Versión en Desarrollo

export default async function handler(req, res) {
  res.status(501).json({ 
    error: "Not Implemented",
    message: "La versión 2 de esta API está actualmente en desarrollo.",
    version: "v2",
    status: "development"
  });
} 