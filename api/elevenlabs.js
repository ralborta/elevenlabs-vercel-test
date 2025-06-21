// Un proxy simple y directo a la API de ElevenLabs.
export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'La API Key de ElevenLabs no está configurada en Vercel.' });
  }

  const url = 'https://api.elevenlabs.io/v1/convai/conversations';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    // Si la respuesta de ElevenLabs no es OK, devolvemos el error para verlo.
    if (!response.ok) {
        return res.status(response.status).json({
            error: `Error desde ElevenLabs: ${response.status}`,
            details: data
        });
    }

    // Devolvemos los datos tal cual los entrega ElevenLabs.
    res.status(200).json(data);

  } catch (error) {
    console.error('Error en el proxy:', error);
    res.status(500).json({ error: 'Error interno del servidor al intentar contactar a ElevenLabs.' });
  }
} 