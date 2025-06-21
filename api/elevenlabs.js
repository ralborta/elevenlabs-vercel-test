export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  // Validar que la API key esté presente
  if (!apiKey) {
    return res.status(400).json({ error: 'API key de ElevenLabs no configurada' });
  }

  // El endpoint correcto para obtener el historial de conversaciones de agentes
  const url = 'https://api.elevenlabs.io/v1/convai/conversations';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Reenviar la respuesta de ElevenLabs, sea exitosa o de error
    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Error en el proxy a ElevenLabs:', error);
    return res.status(500).json({ error: 'Error interno del servidor al contactar ElevenLabs' });
  }
} 